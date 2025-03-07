import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  FlatList,
  Keyboard,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { ApiService } from '../../services/api';
import { QuickReplies } from '../../components/QuickReplies';
import { useLocalSearchParams } from 'expo-router';
import { SOSButton } from '../../components/SOSButton';
import { MoodTrackingService } from '../../services/moodTracking';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function ChatScreen() {
  const { initialMessage, fromMood } = useLocalSearchParams<{ 
    initialMessage: string;
    fromMood: string;
  }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const initialMessageProcessed = useRef(false);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    setMessages([{
      id: '1',
      text: 'Hello! I\'m here to help you with your mental well-being. How are you feeling today?',
      sender: 'bot',
      timestamp: new Date(),
    }]);

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  useEffect(() => {
    if (initialMessage && !initialMessageProcessed.current && fromMood === 'true') {
      initialMessageProcessed.current = true;
      const userMessage: Message = {
        id: Date.now().toString(),
        text: initialMessage,
        sender: 'user',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Get bot response for the mood
      const botResponse = getMoodResponse(initialMessage);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, botMessage]);
      scrollToBottom();
    }
  }, [initialMessage, fromMood]);

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const getMoodResponse = (moodMessage: string): string => {
    const moodLower = moodMessage.toLowerCase();
    
    if (moodLower.includes('sad')) {
      return "I'm sorry to hear that you're feeling sad. Remember that it's okay to feel this way, and I'm here to support you. Would you like to try a quick meditation session or talk about what's bothering you?";
    } else if (moodLower.includes('happy')) {
      return "I'm glad you're feeling happy! It's wonderful to experience positive emotions. Would you like to share what's making you feel this way?";
    } else if (moodLower.includes('anxious')) {
      return "I understand that feeling anxious can be overwhelming. Let's try some breathing exercises together to help you feel more grounded. Would you like that?";
    } else if (moodLower.includes('angry')) {
      return "I hear that you're feeling angry. It's natural to feel this way sometimes. Would you like to explore some calming techniques or talk about what's causing these feelings?";
    } else if (moodLower.includes('calm')) {
      return "It's great that you're feeling calm! This is a good time to practice mindfulness or reflection. Would you like to try a mindfulness exercise to maintain this peaceful state?";
    } else {
      return "Thank you for sharing how you're feeling. Would you like to talk more about it or try some activities to help support your emotional well-being?";
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      let responseText: string;
      
      // Check if this is a mood-based message
      if (fromMood === 'true' && initialMessage) {
        const response = await ApiService.sendMessage(text);
        responseText = response || "I'm here to help. Could you please tell me more?";
      } else {
        // Regular chat message
        const response = await ApiService.sendMessage(text);
        responseText = response || "I'm here to help. Could you please tell me more?";
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
      scrollToBottom();
    } catch (error) {
      console.error('Error in message handling:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'I apologize, but I encountered an error. Please try again or rephrase your message.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const stopSpeaking = async () => {
    try {
      await Speech.stop();
      setIsSpeaking(false);
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  };

  const speakMessage = async (text: string) => {
    try {
      await stopSpeaking();
      setIsSpeaking(true);
      await Speech.speak(text, {
        language: 'en',
        pitch: 1,
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onError: (error) => {
          console.error('Speech error:', error);
          setIsSpeaking(false);
        }
      });
    } catch (error) {
      console.error('Error speaking:', error);
      setIsSpeaking(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.sender === 'user' ? styles.userMessageContainer : styles.botMessageContainer
    ]}>
      <View style={[
        styles.messageBubble,
        item.sender === 'user' ? styles.userBubble : styles.botBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.sender === 'user' ? styles.userMessageText : styles.botMessageText
        ]}>
          {item.text}
        </Text>
        {item.sender === 'bot' && (
          <TouchableOpacity
            style={styles.speakButton}
            onPress={() => speakMessage(item.text)}
          >
            <Ionicons 
              name={isSpeaking ? "volume-high" : "volume-medium"} 
              size={20} 
              color={isSpeaking ? "#007AFF" : "#8E8E93"} 
            />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.timestamp}>
        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PsychAid Chat</Text>
        <SOSButton />
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat</Text>
          {isSpeaking && (
            <TouchableOpacity 
              style={styles.stopButton}
              onPress={stopSpeaking}
            >
              <Ionicons name="stop-circle" size={24} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
        />

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        )}

        <QuickReplies
          suggestions={[
            "How are you feeling?",
            "I need help with anxiety",
            "Tell me about meditation",
            "I'm feeling stressed"
          ]}
          onSelect={handleSendMessage}
        />

        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            multiline
            //maxHeight={100}
            onSubmitEditing={() => handleSendMessage(inputText)}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => handleSendMessage(inputText)}
            disabled={!inputText.trim()}
          >
            <Ionicons 
              name="send" 
              size={24} 
              color={inputText.trim() ? "#007AFF" : "#C7C7CC"} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  stopButton: {
    padding: 8,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  botMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#F2F2F7',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  botMessageText: {
    color: '#000000',
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    marginHorizontal: 4,
  },
  loadingContainer: {
    padding: 8,
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#E9E9EB',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingRight: 40,
    marginRight: 8,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakButton: {
    position: 'absolute',
    right: -30,
    bottom: 0,
    padding: 6,
  },
});