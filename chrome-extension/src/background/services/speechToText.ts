import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';
import { createLogger } from '../log';
import { type ProviderConfig, speechToTextModelStore } from '@extension/storage';
import { t } from '@extension/i18n';

const logger = createLogger('SpeechToText');

export class SpeechToTextService {
  private llm: ChatGoogleGenerativeAI;

  private constructor(llm: ChatGoogleGenerativeAI) {
    this.llm = llm;
  }

  static async create(providers: Record<string, ProviderConfig>): Promise<SpeechToTextService> {
    try {
      const config = await speechToTextModelStore.getSpeechToTextModel();

      if (!config?.provider || !config?.modelName) {
        throw new Error(t('chat_stt_model_notFound'));
      }

      const provider = providers[config.provider];
      logger.info('Found provider for speech-to-text:', provider ? 'yes' : 'no', provider?.type);

      if (!provider || provider.type !== 'gemini') {
        throw new Error(t('chat_stt_model_notFound'));
      }

      const llm = new ChatGoogleGenerativeAI({
        model: config.modelName,
        apiKey: provider.apiKey,
        temperature: 0.1,
        topP: 0.8,
      });
      logger.info(`Speech-to-text service created with model: ${config.modelName}`);
      return new SpeechToTextService(llm);
    } catch (error) {
      logger.error('Failed to create speech-to-text service:', error);
      throw error;
    }
  }

  async transcribeAudio(base64Audio: string): Promise<string> {
    try {
      logger.info('Starting audio transcription...');

      // Create transcription message with audio data
      const transcriptionMessage = new HumanMessage({
        content: [
          {
            type: 'text',
            text: 'You are an elite speech-to-text engine. Transcribe the following audio with extreme precision. \n' +
              '- Output ONLY the raw transcribed text.\n' +
              '- Do not add any commentary, formatting, or metadata.\n' +
              '- If the audio contains noise or silence, return an empty string or the most likely spoken words.\n' +
              '- Maintain original casing and punctuation as heard.',
          },
          {
            type: 'media',
            data: base64Audio,
            mimeType: 'audio/webm',
          },
        ],
      });

      // Get transcription from Gemini
      const transcriptionResponse = await this.llm.invoke([transcriptionMessage]);

      let transcribedText = '';
      if (typeof transcriptionResponse.content === 'string') {
        transcribedText = transcriptionResponse.content;
      } else if (Array.isArray(transcriptionResponse.content)) {
        transcribedText = transcriptionResponse.content
          .map(part => {
            if (typeof part === 'string') return part;
            if ('text' in part) return part.text;
            return '';
          })
          .join('');
      }

      transcribedText = transcribedText.trim();
      logger.info('Audio transcription completed:', transcribedText);

      return transcribedText;
    } catch (error) {
      logger.error('Failed to transcribe audio:', error);
      throw new Error(`Speech transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
