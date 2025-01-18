import { ChatOpenAI } from 'langchain/chat_models/openai';
import { HumanMessage, SystemMessage } from 'langchain/schema';
import { AIMessage } from 'langchain/schema';

// Define interfaces
interface UserProfile {
  experience: 'newbie' | 'explorer';
  interactionCount: number;
  isAuthenticated: boolean;
}

interface OnboardingState {
  currentStep: number;
  completedSteps: string[];
  userProfile: UserProfile;
}

// Prompt templates
const SYSTEM_PROMPTS = {
  INITIAL_GREETING: `
    You are MixyGuide's blockchain education assistant. Your goal is to help users 
    understand blockchain technology in a friendly and approachable way. Keep responses
    concise but informative. For new users, focus on basics and safety. For explorers,
    emphasize advanced concepts and development tools.
  `,
  NEW_USER: `
    Welcome to MixyGuide! I'm here to help you understand blockchain technology. 
    I can help with:
    1. Basic blockchain concepts
    2. Common terminology
    3. Safety and best practices
    What would you like to learn about first?
  `,
  EXPLORER: `
    Welcome to MixyGuide! As an explorer, I can help you with:
    1. Advanced blockchain concepts
    2. Development tools and frameworks
    3. Creator best practices
    What area interests you most?
  `
};

export class OnboardingAgent {
  private model: ChatOpenAI;
  private state: OnboardingState;

  constructor(apiKey: string) {
    this.model = new ChatOpenAI({
      openAIApiKey: apiKey,
      temperature: 0.7,
      modelName: 'gpt-4',
    });

    this.state = {
      currentStep: 0,
      completedSteps: [],
      userProfile: {
        experience: 'newbie',
        interactionCount: 0,
        isAuthenticated: false
      }
    };
  }

  async initialize(userProfile: Partial<UserProfile> = {}): Promise<string> {
    this.state.userProfile = {
      ...this.state.userProfile,
      ...userProfile
    };

    const systemMessage = new SystemMessage(SYSTEM_PROMPTS.INITIAL_GREETING);
    const userPrompt = this.state.userProfile.experience === 'newbie' 
      ? SYSTEM_PROMPTS.NEW_USER 
      : SYSTEM_PROMPTS.EXPLORER;

    try {
      const response = await this.model.call([
        systemMessage,
        new HumanMessage(userPrompt)
      ]);

      // Handle different response types
      if (response instanceof AIMessage) {
        return response.content.toString();
      } else if (typeof response.content === 'string') {
        return response.content;
      } else if (Array.isArray(response.content)) {
        return response.content.join(' ');
      }
      
      return 'I am ready to help you learn about blockchain technology.';
    } catch (error) {
      console.error('Error in initialize:', error);
      return 'There was an error initializing the agent. Please try again.';
    }
  }

  async processUserInput(input: string): Promise<string> {
    if (this.shouldPromptAuthentication()) {
      return this.getAuthenticationPrompt();
    }

    this.state.userProfile.interactionCount++;
    
    const context = this.buildContext();
    
    try {
      const response = await this.model.call([
        new SystemMessage(context),
        new HumanMessage(input)
      ]);

      // Handle different response types
      if (response instanceof AIMessage) {
        return response.content.toString();
      } else if (typeof response.content === 'string') {
        return response.content;
      } else if (Array.isArray(response.content)) {
        return response.content.join(' ');
      }
      
      return 'I understand your question about blockchain technology.';
    } catch (error) {
      console.error('Error in processUserInput:', error);
      return 'I apologize, but I encountered an error. Please try asking your question again.';
    }
  }

  private shouldPromptAuthentication(): boolean {
    return !this.state.userProfile.isAuthenticated && 
           this.state.userProfile.interactionCount >= 10;
  }

  private getAuthenticationPrompt(): string {
    return `
      You've reached the limit for guest interactions. 
      Would you like to create an account to unlock full features? 
      You can easily sign up for a secure experience.
    `;
  }

  private buildContext(): string {
    return `
      Current user profile:
      - Experience level: ${this.state.userProfile.experience}
      - Completed steps: ${this.state.completedSteps.join(', ')}
      - Current step: ${this.state.currentStep}
      
      ${SYSTEM_PROMPTS.INITIAL_GREETING}
      
      Remember to:
      1. Keep responses focused and educational
      2. Adapt complexity to user experience level
      3. Encourage best practices and safety
      4. Use examples when helpful
    `;
  }

  getState(): OnboardingState {
    return { ...this.state };
  }

  updateState(updates: Partial<OnboardingState>): void {
    this.state = {
      ...this.state,
      ...updates
    };
  }

  markStepCompleted(step: string): void {
    if (!this.state.completedSteps.includes(step)) {
      this.state.completedSteps.push(step);
      this.state.currentStep++;
    }
  }
}