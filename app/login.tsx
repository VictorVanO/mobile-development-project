import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link, router } from 'expo-router';
import { WebApiAuthService, SimpleWebApiAuth } from '@/lib/webapi-auth';

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // Test connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const isConnected = await SimpleWebApiAuth.testConnection();
        setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      } catch (error) {
        setConnectionStatus('disconnected');
      }
    };

    testConnection();
  }, []);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!isLogin && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Registration-specific validation
    if (!isLogin) {
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (connectionStatus === 'disconnected') {
      Alert.alert('Connection Error', 'Cannot connect to the server. Please check if the web server is running on localhost:3000');
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      let result;
      
      if (isLogin) {
        result = await WebApiAuthService.login(formData.email, formData.password);
      } else {
        result = await WebApiAuthService.register(
          formData.email,
          formData.password,
          formData.firstName.trim() || undefined,
          formData.lastName.trim() || undefined
        );
      }

      if (result.success) {
        Alert.alert(
          'Success',
          isLogin ? 'Logged in successfully!' : 'Account created successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to main app
                router.replace('/(tabs)');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Error', 'Network error. Please make sure the web server is running.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      confirmPassword: '',
    });
    setErrors({});
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  const testWithExistingUser = async () => {
    try {
      const users = await SimpleWebApiAuth.getUsers();
      if (users.length > 0) {
        setFormData({
          ...formData,
          email: users[0].email,
          password: '12345678' // You'll need to know the actual password
        });
        Alert.alert('Info', `Filled with existing user: ${users[0].email}. You may need to adjust the password.`);
      } else {
        Alert.alert('Info', 'No users found in the database.');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not fetch users from the server.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Connection Status */}
        <View style={styles.connectionStatus}>
          <Text style={[
            styles.connectionText, 
            connectionStatus === 'connected' ? styles.connected : 
            connectionStatus === 'disconnected' ? styles.disconnected : styles.checking
          ]}>
            Server: {connectionStatus === 'checking' ? 'Checking...' : 
                     connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>
            {isLogin ? 'Welcome Back!' : 'Create Account'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Sign in to continue' : 'Join EatReal today'}
          </Text>

          {/* Registration fields */}
          {!isLogin && (
            <View style={styles.nameContainer}>
              <View style={styles.nameField}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.firstName}
                  onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                  placeholder="John"
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.nameField}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.lastName}
                  onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                  placeholder="Doe"
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {/* Email field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Password field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              placeholder={isLogin ? "Password" : "At least 8 characters"}
              secureTextEntry
              autoCapitalize="none"
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Confirm password field (registration only) */}
          {!isLogin && (
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={[styles.input, errors.confirmPassword && styles.inputError]}
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                placeholder="Confirm your password"
                secureTextEntry
                autoCapitalize="none"
              />
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </View>
          )}

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.submitButton, (loading || connectionStatus === 'disconnected') && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading || connectionStatus === 'disconnected'}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          {/* Test button for development */}
          {isLogin && connectionStatus === 'connected' && (
            <TouchableOpacity
              style={styles.testButton}
              onPress={testWithExistingUser}
            >
              <Text style={styles.testButtonText}>
                Fill with existing user (for testing)
              </Text>
            </TouchableOpacity>
          )}

          {/* Toggle mode */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <TouchableOpacity onPress={toggleMode}>
              <Text style={styles.toggleButton}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Back to app */}
          <Link href="/(tabs)" style={styles.backLink}>
            <Text style={styles.backLinkText}>← Back to App</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  connectionStatus: {
    marginBottom: 20,
    alignItems: 'center',
  },
  connectionText: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  checking: {
    backgroundColor: '#f0f0f0',
    color: '#666',
  },
  connected: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  disconnected: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#25292e',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  nameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  nameField: {
    flex: 1,
    marginHorizontal: 4,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#25292e',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#ff6b6b',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  testButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  toggleText: {
    fontSize: 16,
    color: '#666',
  },
  toggleButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  backLink: {
    alignSelf: 'center',
  },
  backLinkText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
  },
});