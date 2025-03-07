interface MoodData {
  timestamp: Date;
  score: number;
  message: string;
}

export class MoodTrackingService {
  private static analyzeMoodFromMessage(message: string): number {
    const positiveWords = ['happy', 'great', 'good', 'excellent', 'amazing'];
    const negativeWords = ['sad', 'bad', 'anxious', 'stressed', 'depressed'];
    
    let score = 3; // neutral starting point
    const messageLower = message.toLowerCase();
    
    positiveWords.forEach(word => {
      if (messageLower.includes(word)) score += 0.5;
    });
    
    negativeWords.forEach(word => {
      if (messageLower.includes(word)) score -= 0.5;
    });
    
    return Math.max(1, Math.min(5, score)); // Keep score between 1-5
  }

  static trackMood(message: string, response: string): MoodData {
    const userMoodScore = this.analyzeMoodFromMessage(message);
    
    return {
      timestamp: new Date(),
      score: userMoodScore,
      message: message,
    };
  }
} 