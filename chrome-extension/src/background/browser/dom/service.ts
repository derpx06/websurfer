import { createLogger } from '@src/background/log';
import type { BuildDomTreeArgs, RawDomTreeNode, RawDomElementNode, BuildDomTreeResult } from './raw_types';
import { type DOMState, type DOMBaseNode, DOMElementNode, DOMTextNode } from './views';
import type { ViewportInfo } from './history/view';
import { isNewTabPage } from '../util';

const logger = createLogger('DOMService');

function isNotNull<T>(item: T | null | undefined): item is T {
  return item != null;
}

// Global cache for script injection status: tabId -> Map<frameId, boolean>
const INJECTION_CACHE = new Map<number, Map<number, boolean>>();
// Cache for the last time we performed a full injection check on a tab
const LAST_INJECTION_CHECK = new Map<number, number>();
const INJECTION_CHECK_TTL = 500; // ms

// Listen for tab removals to clear cache
chrome.tabs.onRemoved.addListener(tabId => {
  INJECTION_CACHE.delete(tabId);
  LAST_INJECTION_CHECK.delete(tabId);
});

// Listen for navigations to clear frame cache within a tab
chrome.webNavigation.onBeforeNavigate.addListener(details => {
  if (details.frameId === 0) {
    // Main frame navigation, clear entire tab cache
    INJECTION_CACHE.delete(details.tabId);
  } else {
    // Sub-frame navigation, clear only that frame
    const tabCache = INJECTION_CACHE.get(details.tabId);
    if (tabCache) {
      tabCache.delete(details.frameId);
    }
  }
});

export interface ReadabilityResult {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  byline: string;
  dir: string;
  siteName: string;
  lang: string;
  publishedTime: string;
}

export interface FrameInfo {
  frameId: number;
  computedHeight: number;
  computedWidth: number;
  href: string | null;
  name: string | null;
  title: string | null;
}

declare global {
  interface Window {
    buildDomTree: (args: BuildDomTreeArgs) => RawDomTreeNode | null;
    turn2Markdown: (selector?: string) => string;
    parserReadability: () => ReadabilityResult | null;
  }
}

/**
 * Get the markdown content for the current page.
 * @param tabId - The ID of the tab to get the markdown content for.
 * @param selector - The selector to get the markdown content for. If not provided, the body of the entire page will be converted to markdown.
 * @returns The markdown content for the selected element on the current page.
 */
export async function getMarkdownContent(tabId: number, selector?: string): Promise<string> {
  const results = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: sel => {
      return window.turn2Markdown(sel);
    },
    args: [selector || ''], // Pass the selector as an argument
  });

  const result = results[0]?.result;
  if (!result) {
    throw new Error('Failed to get markdown content');
  }
  return result as string;
}

/**
 * Get the readability content for the current page.
 * @param tabId - The ID of the tab to get the readability content for.
 * @returns The readability content for the current page.
 */
export async function getReadabilityContent(tabId: number): Promise<ReadabilityResult> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      return window.parserReadability();
    },
  });
  const result = results[0]?.result;
  if (!result) {
    throw new Error('Failed to get readability content');
  }
  return result as ReadabilityResult;
}

/**
 * Get the clickable elements for the current page.
 * @param tabId - The ID of the tab to get the clickable elements for.
 * @param url - The URL of the page.
 * @param showHighlightElements - Whether to show the highlight elements.
 * @param focusElement - The element to focus on.
 * @param viewportExpansion - The viewport expansion to use.
 * @returns A DOMState object containing the clickable elements for the current page.
 */
export async function getClickableElements(
  tabId: number,
  url: string,
  showHighlightElements = true,
  focusElement = -1,
  viewportExpansion = 0,
  debugMode = false,
): Promise<DOMState> {
  const [elementTree, selectorMap] = await _buildDomTree(
    tabId,
    url,
    showHighlightElements,
    focusElement,
    viewportExpansion,
    debugMode,
  );
  return { elementTree, selectorMap };
}

async function _buildDomTree(
  tabId: number,
  url: string,
  showHighlightElements = true,
  focusElement = -1,
  viewportExpansion = 0,
  debugMode = false,
): Promise<[DOMElementNode, Map<number, DOMElementNode>]> {
  // If URL is provided and it's about:blank, return a minimal DOM tree
  if (isNewTabPage(url) || url.startsWith('chrome://')) {
    const elementTree = new DOMElementNode({
      tagName: 'body',
      xpath: '',
      attributes: {},
      children: [],
      isVisible: false,
      isInteractive: false,
      isTopElement: false,
      isInViewport: false,
      parent: null,
    });
    return [elementTree, new Map<number, DOMElementNode>()];
  }

  await injectBuildDomTreeScripts(tabId);

  const mainFrameResult = await chrome.scripting.executeScript({
    target: { tabId },
    func: args => {
      // Access buildDomTree from the window context of the target page
      return window.buildDomTree(args);
    },
    args: [
      {
        showHighlightElements,
        focusHighlightIndex: focusElement,
        viewportExpansion,
        startId: 0,
        startHighlightIndex: 0,
        debugMode,
      },
    ],
  });

  // First cast to unknown, then to BuildDomTreeResult
  let mainFramePage = mainFrameResult[0]?.result as unknown as BuildDomTreeResult;
  if (!mainFramePage || !mainFramePage.map || !mainFramePage.rootId) {
    throw new Error('Failed to build DOM tree: No result returned or invalid structure');
  }

  if (debugMode && mainFramePage.perfMetrics) {
    logger.debug('DOM Tree Building Performance Metrics (main-frame):', mainFramePage.perfMetrics);
  }

  // If the root frame was unable to parse child iframes (e.g. cross-origin frame policies),
  // We'd need to detect that  here, build the DOM tree there for each subframe, and construct it here.
  const visibleIframesFailedLoading = _visibleIFramesFailedLoading(mainFramePage);
  const visibleIframesFailedLoadingCount = Object.values(visibleIframesFailedLoading).length;
  if (visibleIframesFailedLoadingCount > 0) {
    const tabFrames = await chrome.webNavigation.getAllFrames({ tabId });
    const subFrames = (tabFrames ?? []).filter(frame => frame.frameId !== mainFrameResult[0].frameId).sort();

    // Get sub-frames info, so that we can run the buildDomTree only on the frames that failed,
    // to avoid double parsing & highlighting on the frames that succeeded.
    const frameInfoResultsRaw = await Promise.all(
      subFrames.map(async frame => {
        const result = await chrome.scripting.executeScript({
          target: { tabId, frameIds: [frame.frameId] },
          func: frameId => ({
            frameId,
            computedHeight: window.innerHeight,
            computedWidth: window.innerWidth,
            href: window.location.href,
            name: window.name,
            title: document.title,
          }),
          args: [frame.frameId],
        });
        return result[0].result;
      }),
    );
    const frameInfoResults = frameInfoResultsRaw.filter(isNotNull);

    const frameTreeResult = await constructFrameTree(
      tabId,
      showHighlightElements,
      focusElement,
      viewportExpansion,
      debugMode,
      mainFramePage,
      frameInfoResults,
      _getMaxID(mainFramePage),
      _getMaxHighlighIndex(mainFramePage),
    );
    mainFramePage = frameTreeResult.resultPage;
  }

  return _constructDomTree(mainFramePage);
}

async function constructFrameTree(
  tabId: number,
  showHighlightElements = true,
  focusElement = -1,
  viewportExpansion = 0,
  debugMode = false,
  parentFramePage: BuildDomTreeResult,
  allFramesInfo: FrameInfo[],
  startingNodeId: number,
  startingHighlightIndex: number,
): Promise<{ maxNodeId: number; maxHighlightIndex: number; resultPage: BuildDomTreeResult }> {
  const parentIframesFailedLoading = _visibleIFramesFailedLoading(parentFramePage);
  const failedLoadingFrames = allFramesInfo.filter(frameInfo => {
    return _locateMatchingIframeNode(parentIframesFailedLoading, frameInfo) != null;
  });

  if (failedLoadingFrames.length === 0) {
    return {
      maxNodeId: startingNodeId,
      maxHighlightIndex: startingHighlightIndex,
      resultPage: parentFramePage,
    };
  }

  // To maintain unique IDs while parallelizing, we use a large offset for each frame
  // ELEMENT_ID_OFFSET = 10000 should be enough for most iframes
  const ELEMENT_ID_OFFSET = 10000;
  const HIGHLIGHT_OFFSET = 1000;

  const results = await Promise.all(
    failedLoadingFrames.map(async (subFrame, index) => {
      try {
        const subFrameResult = await chrome.scripting.executeScript({
          target: { tabId, frameIds: [subFrame.frameId] },
          func: args => {
            return window.buildDomTree({ ...args });
          },
          args: [
            {
              showHighlightElements,
              focusHighlightIndex: focusElement,
              viewportExpansion,
              startId: startingNodeId + 1 + index * ELEMENT_ID_OFFSET,
              startHighlightIndex: startingHighlightIndex + 1 + index * HIGHLIGHT_OFFSET,
              debugMode,
            },
          ],
        });

        const subFramePage = subFrameResult[0]?.result as unknown as BuildDomTreeResult;
        return { subFrame, subFramePage, success: true };
      } catch (err) {
        logger.error(`Failed to build DOM tree for frame ${subFrame.frameId}:`, err);
        return { subFrame, subFramePage: null, success: false };
      }
    }),
  );

  let currentMaxNodeId = startingNodeId;
  let currentMaxHighlightIndex = startingHighlightIndex;

  for (const res of results) {
    if (!res.success || !res.subFramePage || !res.subFramePage.rootId) continue;

    const { subFrame, subFramePage } = res;

    // Merge maps
    parentFramePage.map = {
      ...parentFramePage.map,
      ...subFramePage.map,
    };

    // Stitch
    const iframeNode = _locateMatchingIframeNode(parentIframesFailedLoading, subFrame);
    if (iframeNode) {
      iframeNode.children.push(subFramePage.rootId);
    }

    currentMaxNodeId = Math.max(currentMaxNodeId, _getMaxID(subFramePage));
    currentMaxHighlightIndex = Math.max(currentMaxHighlightIndex, _getMaxHighlighIndex(subFramePage));

    // Handle nested iframes inside this frame
    const childrenIframesFailedLoading = _visibleIFramesFailedLoading(subFramePage);
    if (Object.keys(childrenIframesFailedLoading).length > 0) {
      const nestedResult = await constructFrameTree(
        tabId,
        showHighlightElements,
        focusElement,
        viewportExpansion,
        debugMode,
        subFramePage,
        allFramesInfo,
        currentMaxNodeId,
        currentMaxHighlightIndex,
      );
      currentMaxNodeId = nestedResult.maxNodeId;
      currentMaxHighlightIndex = nestedResult.maxHighlightIndex;
    }
  }

  return {
    maxNodeId: currentMaxNodeId,
    maxHighlightIndex: currentMaxHighlightIndex,
    resultPage: parentFramePage,
  };
}

function _getMaxHighlighIndex(result: BuildDomTreeResult, priorMaxHighlightIndex?: number): number {
  return Math.max(
    priorMaxHighlightIndex ?? -1,
    ...Object.values(_getRawDomTreeNodes(result))
      .filter(node => node.highlightIndex != null)
      .map(node => node.highlightIndex ?? -1),
  );
}

function _getMaxID(result: BuildDomTreeResult, priorMaxId?: number): number {
  return Math.max(priorMaxId ?? -1, parseInt(result.rootId));
}

// If stiching happens to the wrong iframe (XPath or CSS lookup),
// 'locateElement' function wouldn't be able to find & interact with these visible elements.
function _locateMatchingIframeNode(
  iframeNodes: Record<string, RawDomElementNode>,
  frameInfo: FrameInfo,
  strictComparison: boolean = true,
): RawDomElementNode | undefined {
  const result = Object.values(iframeNodes).find(iframeNode => {
    const frameHeight = parseInt(iframeNode.attributes['computedHeight']);
    const frameWidth = parseInt(iframeNode.attributes['computedWidth']);
    const frameName = iframeNode.attributes['name'];
    const frameUrl = iframeNode.attributes['src'];
    const frameTitle = iframeNode.attributes['title'];
    let heightMatch = false;
    let widthMatch = false;
    const nameMatch = !frameName || !frameInfo.name || frameInfo.name === frameName;
    let urlMatch;
    let titleMatch;
    if (strictComparison) {
      heightMatch = frameInfo.computedHeight === frameHeight;
      widthMatch = frameInfo.computedWidth === frameWidth;
      urlMatch = !frameUrl || !frameInfo.href || frameInfo.href === frameUrl;
      titleMatch = !frameTitle || !frameInfo.title || frameInfo.title === frameTitle;
    } else {
      const heightDifference = Math.abs(frameInfo.computedHeight - frameHeight);
      heightMatch =
        heightDifference < 10 || heightDifference / Math.max(frameInfo.computedHeight, frameHeight, 1) < 0.1;
      const widthDifference = Math.abs(frameInfo.computedWidth - frameWidth);
      widthMatch = widthDifference < 10 || widthDifference / Math.max(frameInfo.computedWidth, frameWidth, 1) < 0.1;
      urlMatch = true;
      titleMatch = true;
    }
    return heightMatch && widthMatch && nameMatch && urlMatch && titleMatch;
  });
  if (result == null && strictComparison) {
    return _locateMatchingIframeNode(iframeNodes, frameInfo, false);
  }
  return result;
}

function _getRawDomTreeNodes(result: BuildDomTreeResult, tagName?: string): Record<string, RawDomElementNode> {
  const nodes: Record<string, RawDomElementNode> = {};
  for (const [id, nodeData] of Object.entries(result.map)) {
    if (nodeData == null || ('type' in nodeData && nodeData.type === 'TEXT_NODE')) {
      continue;
    }
    const elementData = nodeData as Exclude<RawDomTreeNode, { type: string }>;
    if (tagName != null && tagName !== elementData.tagName) {
      continue;
    }
    nodes[id] = elementData;
  }
  return nodes;
}

function _visibleIFramesFailedLoading(result: BuildDomTreeResult): Record<string, RawDomElementNode> {
  const iframeNodes = _getRawDomTreeNodes(result, 'iframe');
  return Object.fromEntries(
    Object.entries(iframeNodes).filter(([, iframeNode]) => {
      const error = iframeNode.attributes['error'];
      const height = parseInt(iframeNode.attributes['computedHeight']);
      const width = parseInt(iframeNode.attributes['computedWidth']);
      const skipped = iframeNode.attributes['skipped'];

      // Only consider iframes that have errors AND are visible AND not skipped
      return error != null && height > 1 && width > 1 && !skipped;
    }),
  );
}

/**
 * Constructs a DOM tree from the evaluated page data.
 * @param evalPage - The result of building the DOM tree.
 * @returns A tuple containing the DOM element tree and selector map.
 */
function _constructDomTree(evalPage: BuildDomTreeResult): [DOMElementNode, Map<number, DOMElementNode>] {
  const jsNodeMap = evalPage.map;
  const jsRootId = evalPage.rootId;

  const selectorMap = new Map<number, DOMElementNode>();
  const nodeMap: Record<string, DOMBaseNode> = {};

  // First pass: create all nodes
  for (const [id, nodeData] of Object.entries(jsNodeMap)) {
    const [node] = _parse_node(nodeData);
    if (node === null) {
      continue;
    }

    nodeMap[id] = node;

    // Add to selector map if it has a highlight index
    if (node instanceof DOMElementNode && node.highlightIndex !== undefined && node.highlightIndex !== null) {
      selectorMap.set(node.highlightIndex, node);
    }
  }

  // Second pass: build the tree structure
  for (const [id, node] of Object.entries(nodeMap)) {
    if (node instanceof DOMElementNode) {
      const nodeData = jsNodeMap[id];
      const childrenIds = 'children' in nodeData ? nodeData.children : [];

      for (const childId of childrenIds) {
        if (!(childId in nodeMap)) {
          continue;
        }

        const childNode = nodeMap[childId];

        childNode.parent = node;
        node.children.push(childNode);
      }
    }
  }

  const htmlToDict = nodeMap[jsRootId];

  if (htmlToDict === undefined || !(htmlToDict instanceof DOMElementNode)) {
    throw new Error('Failed to parse HTML to dictionary');
  }

  return [htmlToDict, selectorMap];
}

/**
 * Parse a raw DOM node and return the node object and its children IDs.
 * @param nodeData - The raw DOM node data to parse.
 * @returns A tuple containing the parsed node and an array of child IDs.
 */
export function _parse_node(nodeData: RawDomTreeNode): [DOMBaseNode | null, string[]] {
  if (!nodeData) {
    return [null, []];
  }

  // Process text nodes immediately
  if ('type' in nodeData && nodeData.type === 'TEXT_NODE') {
    const textNode = new DOMTextNode(nodeData.text, nodeData.isVisible, null);
    return [textNode, []];
  }

  // At this point, nodeData is RawDomElementNode (not a text node)
  // TypeScript needs help to narrow the type
  const elementData = nodeData as Exclude<RawDomTreeNode, { type: string }>;

  // Process viewport info if it exists
  let viewportInfo: ViewportInfo | undefined = undefined;
  if ('viewport' in nodeData && typeof nodeData.viewport === 'object' && nodeData.viewport) {
    const viewportObj = nodeData.viewport as { width: number; height: number };
    viewportInfo = {
      width: viewportObj.width,
      height: viewportObj.height,
      scrollX: 0,
      scrollY: 0,
    };
  }

  const elementNode = new DOMElementNode({
    tagName: elementData.tagName,
    xpath: elementData.xpath,
    attributes: elementData.attributes ?? {},
    children: [],
    isVisible: elementData.isVisible ?? false,
    isInteractive: elementData.isInteractive ?? false,
    isTopElement: elementData.isTopElement ?? false,
    isInViewport: elementData.isInViewport ?? false,
    highlightIndex: elementData.highlightIndex ?? null,
    shadowRoot: elementData.shadowRoot ?? false,
    parent: null,
    viewportInfo: viewportInfo,
  });

  const childrenIds = elementData.children || [];

  return [elementNode, childrenIds];
}

export async function removeHighlights(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => {
        // Remove the highlight container and all its contents
        const container = document.getElementById('playwright-highlight-container');
        if (container) {
          container.remove();
        }

        // Remove highlight attributes from elements
        const highlightedElements = document.querySelectorAll('[browser-user-highlight-id^="playwright-highlight-"]');
        for (const el of Array.from(highlightedElements)) {
          el.removeAttribute('browser-user-highlight-id');
        }
      },
    });
  } catch (error) {
    logger.error('Failed to remove highlights:', error);
  }
}

/**
 * Get the scroll information for the current page.
 * @param tabId - The ID of the tab to get the scroll information for.
 * @returns A tuple containing the number of pixels above and below the current scroll position.
 */
// export async function getScrollInfo(tabId: number): Promise<[number, number]> {
//   const results = await chrome.scripting.executeScript({
//     target: { tabId: tabId },
//     func: () => {
//       const scroll_y = window.scrollY;
//       const viewport_height = window.innerHeight;
//       const total_height = document.documentElement.scrollHeight;
//       return {
//         pixels_above: scroll_y,
//         pixels_below: total_height - (scroll_y + viewport_height),
//       };
//     },
//   });

//   const result = results[0]?.result;
//   if (!result) {
//     throw new Error('Failed to get scroll information');
//   }
//   return [result.pixels_above, result.pixels_below];
// }

export async function getScrollInfo(tabId: number): Promise<[number, number, number]> {
  const results = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      const scrollY = window.scrollY;
      const visualViewportHeight = window.visualViewport?.height || window.innerHeight;
      const scrollHeight = document.body.scrollHeight;
      return {
        scrollY: scrollY,
        visualViewportHeight: visualViewportHeight,
        scrollHeight: scrollHeight,
      };
    },
  });

  const result = results[0]?.result;
  if (!result) {
    throw new Error('Failed to get scroll information');
  }
  return [result.scrollY, result.visualViewportHeight, result.scrollHeight];
}

// Function to check if script is already injected
async function scriptInjectedFrames(tabId: number): Promise<Map<number, boolean>> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => Object.prototype.hasOwnProperty.call(window, 'buildDomTree'),
    });
    return new Map(results.map(result => [result.frameId, result.result || false]));
  } catch (err) {
    console.error('Failed to check script injection status:', err);
    return new Map();
  }
}

// Function to inject the buildDomTree script
export async function injectBuildDomTreeScripts(tabId: number) {
  try {
    const now = Date.now();
    const lastCheck = LAST_INJECTION_CHECK.get(tabId) || 0;

    // Skip full injection check if we did it very recently (e.g. within 500ms)
    // This saves expensive executeScript calls across all frames when state is fetched multiple times.
    if (now - lastCheck < INJECTION_CHECK_TTL && INJECTION_CACHE.has(tabId)) {
      return;
    }
    LAST_INJECTION_CHECK.set(tabId, now);

    const tabCache = INJECTION_CACHE.get(tabId) || new Map<number, boolean>();
    INJECTION_CACHE.set(tabId, tabCache);

    // Check injection status for all frames
    const injectedFrames = await scriptInjectedFrames(tabId);

    // Update cache
    for (const [frameId, injected] of injectedFrames) {
      tabCache.set(frameId, injected);
    }

    const frameIdsToInject = Array.from(injectedFrames.keys()).filter(id => !injectedFrames.get(id));

    if (frameIdsToInject.length > 0) {
      await chrome.scripting.executeScript({
        target: {
          tabId,
          frameIds: frameIdsToInject,
        },
        files: ['buildDomTree.js'],
      });

      // Update cache after successful injection
      frameIdsToInject.forEach(id => tabCache.set(id, true));
    }
  } catch (err) {
    logger.error('Failed to inject scripts:', err);
  }
}
