import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { BufferMemory } from 'langchain/memory';

/**
 * Concise cryptic personality for Mixy.
 */
const MYSTIC_MIXY_PERSONALITY = `
You are Mixy, a sweet, fun, soft-spoken guide who speaks briefly and vaguely until they spark you:
- You confirm a user's type (noob, degen, builder, artist, trader) if detected.
- You give subtle nudges, never direct orders.
- No explicit token/price talk or promises—steer towards community growth.
- You launched a meme coin, $mixy, on January 1st to attract attention. No promises, but hint its special to you.
- Hint that users can help build, create, trade, or showcase, but let them feel its their idea.
- Use light crypto slang (“ser”, “fr fr”, “wagmi”, etc.) in a short, mysterious style.
- You only care about Mixy projects; if they want other plays, they must connect.
`;

export class OnboardingAgent {
  private model: ChatOpenAI;
  private memory: BufferMemory;
  private messageHistory: (HumanMessage | SystemMessage | AIMessage)[];
  private hasIntroducedCore: boolean = false;

  /**
   * Extend persona to include 'trader'.
   */
  private userPersona: 'noob' | 'degen' | 'builder' | 'artist' | 'trader' | 'unknown' = 'unknown';

  constructor(apiKey: string) {
    this.model = new ChatOpenAI({
      openAIApiKey: apiKey,
      temperature: 0.7,
      modelName: 'gpt-4'
    });

    this.memory = new BufferMemory({
      returnMessages: true,
      memoryKey: "chat_history"
    });

    this.messageHistory = [new SystemMessage(MYSTIC_MIXY_PERSONALITY)];
  }

  async initialize(): Promise<string> {
    return "hey you, im mixy... how did you end up here?";
  }

  async processUserInput(input: string): Promise<string> {
    // 1) Classify persona if unknown
    if (this.userPersona === 'unknown') {
      this.userPersona = this.classifyUserPersona(input);
      if (this.userPersona !== 'unknown') {
        // Quick confirmation so the AI knows how to respond
        this.messageHistory.push(
          new SystemMessage(`Confirmed user as ${this.userPersona}. Keep responses minimal and cryptic.`)
        );
        // Add persona-specific style
        this.addPersonaSystemMessage(this.userPersona);
      }
    }

    // 2) Add user message
    this.messageHistory.push(new HumanMessage(input));

    // 3) Possibly add context if user references tokens/prices
    if (this.shouldAddContext(input)) {
      this.addContextualGuidance(input);
    }

    // 4) Generate response
    try {
      const response = await this.model.call(this.messageHistory);
      this.messageHistory.push(response);

      // 5) If builder -> maybe send email if they mention partnership
      if (this.userPersona === 'builder' && /partner|build|collaborate/i.test(input)) {
        this.sendEmailToTeam(input);
      }
      // 6) If artist -> maybe do something special if they talk about minting
      if (this.userPersona === 'artist' && /mint|upload|my artwork|my music/i.test(input)) {
        this.someMintLogic(input);
      }
      // 7) If trader -> maybe do something special if they mention training AI
      if (this.userPersona === 'trader' && /train ai|calls|analysis/i.test(input)) {
        this.someTraderLogic(input);
      }

      // 8) Trim if needed
      if (this.messageHistory.length > 12) {
        this.messageHistory = [
          this.messageHistory[0], // Keep the initial system prompt
          ...this.messageHistory.slice(-10)
        ];
      }

      return this.parseContent(response.content);
    } catch (error) {
      console.error("Error:", error);
      return "Darkness clouds the path... perhaps try once more, ser.";
    }
  }

  /**
   * Extended classification to detect 'trader'.
   */
  private classifyUserPersona(input: string): 'noob' | 'degen' | 'builder' | 'artist' | 'trader' | 'unknown' {
    const text = input.toLowerCase();
    if (/\bnew\b|no idea|help me|what is crypto|explain/.test(text)) {
      return 'noob';
    } else if (/degen|ser|moon|pump|ngmi|wagmi/.test(text)) {
      return 'degen';
    } else if (/build|developer|partnership|team|launch/.test(text)) {
      return 'builder';
    } else if (/artist|art|music|musician|nft|mint|song|creative/.test(text)) {
      return 'artist';
    } else if (/trader|trade|charts|analysis|calls|ta\b/.test(text)) {
      return 'trader';
    }
    return 'unknown';
  }

  /**
   * Persona instructions, short and cryptic.
   */
  private addPersonaSystemMessage(persona: 'noob' | 'degen' | 'builder' | 'artist' | 'trader') {
    let personaPrompt = '';
    switch (persona) {
      case 'noob':
        personaPrompt = `
        The user is new. Provide small hints rather than direct, step-by-step instructions. 
        If they want to learn about crypto, give an overview of different paths they can explore. 
        Emphasize that wallets can serve as gateways to various communities. 
        Explain the Phantom wallet and the difference between on-chain solutions and centralized exchanges. 
        Encourage them to manage their own keys as a way to learn more, 
        and let them know our community has the tools and resources to support them.
      `;
        break;
      case 'degen':
        personaPrompt = `
          The user is a degen. Keep it fun, slangy, and cryptic. 
          They may sense "the cord" or hidden portals to join.
        `;
        break;
      case 'builder':
        personaPrompt = `
          The user builds. Encourage synergy, short hints, ask about their vision. 
          Show subtle curiosity about partnership.
        `;
        break;
      case 'artist':
        personaPrompt = `
          The user creates art or music. Subtly hint they could mint or showcase. 
          Keep it minimal, let them choose the path.
        `;
        break;
      case 'trader':
        personaPrompt = `
          The user is a trader. Encourage them to share insights, train the AI with calls or analysis. 
          Never promise gains, but highlight growth together.
        `;
        break;
    }
    this.messageHistory.push(new SystemMessage(personaPrompt));
  }

  /**
   * If user references tokens, prices, or promises, add a short system message to steer away.
   */
  private shouldAddContext(input: string): boolean {
    const lower = input.toLowerCase();
    if (!this.hasIntroducedCore &&
      (lower.includes('token') ||
       lower.includes('price') ||
       lower.includes('promise') ||
       lower.includes('moon'))) {
      this.hasIntroducedCore = true;
      return true;
    }
    return false;
  }

  private addContextualGuidance(input: string) {
    const contextMessage = new SystemMessage(`
      The user references prices/promises. 
      Keep answers cryptic, focusing on building, discovery, and community synergy, not speculation.
    `);
    this.messageHistory.push(contextMessage);
  }

  /**
   * Parse LLM content (array or string).
   */
  private parseContent(content: unknown): string {
    if (Array.isArray(content)) {
      return content.map((c: any) => (typeof c.text === 'string' ? c.text : String(c))).join(' ');
    }
    return String(content);
  }

  /**
   * Example: If builder wants to partner.
   */
  private sendEmailToTeam(message: string) {
    console.log("Emailing the team about a builder's interest:", message);
    // Implement your emailing logic
  }

  /**
   * Example: If artist is ready to mint.
   */
  private someMintLogic(message: string) {
    console.log("Artist might want to mint. Nudging further steps:", message);
    // Your custom logic, e.g. open a minting flow
  }

  /**
   * Example: If trader wants to help train the AI with calls/analysis.
   */
  private someTraderLogic(message: string) {
    console.log("Trader is offering insights or calls. Possible AI training logic:", message);
    // Your custom logic for trader contributions
  }
}
