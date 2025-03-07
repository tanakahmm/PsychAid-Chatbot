import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { ApiService } from '../../services/api';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userType, setUserType] = useState<'student' | 'parent'>('student');
  const [loading, setLoading] = useState(false);
  const [childEmail, setChildEmail] = useState('');

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return false;
    }
    if (!password || password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return false;
    }
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your first name');
      return false;
    }
    if (!lastName.trim()) {
      Alert.alert('Error', 'Please enter your last name');
      return false;
    }
    if (!userType || !['student', 'parent'].includes(userType)) {
      Alert.alert('Error', 'Please select a valid user type');
      return false;
    }
    if (userType === 'parent' && !childEmail.trim()) {
      Alert.alert('Error', 'Please enter your child\'s email');
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      console.log('Attempting signup with:', {
        email: email.trim(),
        name: name.trim(),
        lastName: lastName.trim(),
        userType,
        childEmail: childEmail.trim(),
      });

      const response = await ApiService.signup(
        email.trim(),
        password,
        name.trim(),
        lastName.trim(),
        userType,
        childEmail.trim(),
      );

      console.log('Signup response:', response);

      if (response && response.access_token && response.user) {
        router.replace('/(tabs)/mood');
      } else {
        Alert.alert(
          'Signup Failed',
          'Invalid response from server. Please try again.'
        );
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'An error occurred during signup';
      Alert.alert(
        'Signup Failed',
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create Account</Text>
        
        <TextInput
          style={styles.input}
          placeholder="First Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Last Name"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password (min. 8 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <View style={styles.userTypeContainer}>
          <TouchableOpacity
            style={[
              styles.userTypeButton,
              userType === 'student' && styles.userTypeButtonActive,
            ]}
            onPress={() => setUserType('student')}
            disabled={loading}
          >
            <Text style={[
              styles.userTypeText,
              userType === 'student' && styles.userTypeTextActive,
            ]}>Student</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.userTypeButton,
              userType === 'parent' && styles.userTypeButtonActive,
            ]}
            onPress={() => setUserType('parent')}
            disabled={loading}
          >
            <Text style={[
              styles.userTypeText,
              userType === 'parent' && styles.userTypeTextActive,
            ]}>Parent</Text>
          </TouchableOpacity>
        </View>

        {userType === 'parent' && (
          <TextInput
            style={styles.input}
            placeholder="Child's Email"
            value={childEmail}
            onChangeText={setChildEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!loading}
          />
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push('/auth/login')}
          disabled={loading}
        >
          <Text style={styles.linkText}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#2c3e50',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  userTypeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  userTypeButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  userTypeButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  userTypeText: {
    color: '#333',
    fontSize: 16,
  },
  userTypeTextActive: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    alignItems: 'center',
  },
  linkText: {
    color: '#3498db',
    fontSize: 14,
  },
}); 