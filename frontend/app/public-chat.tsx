import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { ApiService } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface Styles {
  container: ViewStyle;
  titleContainer: ViewStyle;
  titleWrapper: ViewStyle;
  title: TextStyle;
  subtitleContainer: ViewStyle;
  subtitle: TextStyle;
  backButton: ViewStyle;
  loginButton: ViewStyle;
  loginButtonText: TextStyle;
  loginIcon: ViewStyle;
  messagesList: ViewStyle;
  messageContainer: ViewStyle;
  userMessage: ViewStyle;
  botMessage: ViewStyle;
  messageBubble: ViewStyle;
  userBubble: ViewStyle;
  botBubble: ViewStyle;
  messageText: TextStyle;
  userMessageText: TextStyle;
  botMessageText: TextStyle;
  timestamp: TextStyle;
  userTimestamp: TextStyle;
  botTimestamp: TextStyle;
  inputContainer: ViewStyle;
  input: ViewStyle & TextStyle;
  sendButton: ViewStyle;
  sendButtonDisabled: ViewStyle;
}

export default function PublicChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await ApiService.publicChat(inputText.trim());
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.botMessage
    ]}>
      <View style={[
        styles.messageBubble,
        item.isUser ? styles.userBubble : styles.botBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.isUser ? styles.userMessageText : styles.botMessageText
        ]}>
          {item.text}
        </Text>
        <Text style={[
          styles.timestamp,
          item.isUser ? styles.userTimestamp : styles.botTimestamp
        ]}>
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.titleContainer}>
        <View style={styles.titleWrapper}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.title}>Mental Health Chat</Text>
        </View>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.loginButtonText}>Login</Text>
          <Ionicons name="log-in-outline" size={20} color="#3498db" style={styles.loginIcon} />
        </TouchableOpacity>
      </View>

      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitle}>Chat with our AI assistant about mental health</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        onLayout={() => flatListRef.current?.scrollToEnd()}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="send" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
    marginLeft: 12,
  },
  subtitleContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 44, // Align with title text
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498db',
    marginRight: 4,
  },
  loginIcon: {
    marginLeft: 2,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  botMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: '#3498db',
  },
  botBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  botMessageText: {
    color: '#2c3e50',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.8)',
  },
  botTimestamp: {
    color: '#7f8c8d',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 12,
    fontSize: 16,
    maxHeight: 100,
    color: '#2c3e50',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3498db',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
}); 