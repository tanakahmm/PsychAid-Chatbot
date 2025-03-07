export const analyzeMood = (text: string): number => {
  const positiveWords = ['happy', 'good', 'great', 'excellent', 'amazing', 'better'];
  const negativeWords = ['sad', 'bad', 'terrible', 'awful', 'worse', 'anxious', 'depressed'];
  
  const words = text.toLowerCase().split(' ');
  let score = 3; // neutral starting point
  
  words.forEach(word => {
    if (positiveWords.includes(word)) score += 0.5;
    if (negativeWords.includes(word)) score -= 0.5;
  });
  
  return Math.max(1, Math.min(5, score)); // Keep score between 1-5
}; 