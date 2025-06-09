import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';

// Web API base URL
const WEB_API_BASE_URL = 'http://192.168.88.34:3000';

export default function AddReviewScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  
  // Form state
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [price, setPrice] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Restaurant info from params
  const restaurantName = params.restaurantName as string || 'Restaurant';
  const latitude = parseFloat(params.latitude as string || '0');
  const longitude = parseFloat(params.longitude as string || '0');
  const address = params.address as string || '';

  const priceOptions = [
    { value: '€', label: '€ (Inexpensive)' },
    { value: '€€', label: '€€ (Moderate)' },
    { value: '€€€', label: '€€€ (Expensive)' },
    { value: '€€€€', label: '€€€€ (Very Expensive)' },
  ];

  // Request camera permissions
  const requestCameraPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Please grant camera permission to take photos of your meals.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Take photo with camera
  const takePhoto = async () => {
    try {
      const hasPermission = await requestCameraPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const newImage = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setImages(prev => [...prev, newImage].slice(0, 5)); // Limit to 5 images
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  // Pick image from gallery
  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => 
          `data:image/jpeg;base64,${asset.base64}`
        );
        setImages(prev => [...prev, ...newImages].slice(0, 5)); // Limit to 5 images
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  // Show image picker options
  const showImagePicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Gallery'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            takePhoto();
          } else if (buttonIndex === 2) {
            pickFromGallery();
          }
        }
      );
    } else {
      // For Android, show a custom alert
      Alert.alert(
        'Add Photo',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: takePhoto },
          { text: 'Choose from Gallery', onPress: pickFromGallery },
        ]
      );
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to add a review.');
      return;
    }

    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating.');
      return;
    }

    if (!restaurantName || !latitude || !longitude) {
      Alert.alert('Error', 'Invalid restaurant information.');
      return;
    }

    setLoading(true);

    try {
      console.log('Submitting review with data:', {
        restaurantName,
        latitude,
        longitude,
        address,
        rating,
        review,
        price,
        userEmail: user.email,
        imagesCount: images.length
      });

      // Create FormData
      const formData = new FormData();
      formData.append('restaurantName', restaurantName);
      formData.append('latitude', latitude.toString());
      formData.append('longitude', longitude.toString());
      formData.append('address', address);
      formData.append('rating', rating.toString());
      formData.append('review', review);
      formData.append('price', price);

      // Add images
      images.forEach((image, index) => {
        formData.append('imageUrls', image);
        console.log(`Added image ${index + 1} to form data`);
      });

      console.log('Making API request to:', `${WEB_API_BASE_URL}/api/reviews`);

      const response = await fetch(`${WEB_API_BASE_URL}/api/reviews`, {
        method: 'POST',
        body: formData,
        headers: {
          'X-User-Email': user.email,
          // Don't set Content-Type header when using FormData - let the browser set it
        },
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      let result;
      try {
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        if (responseText) {
          result = JSON.parse(responseText);
        } else {
          result = { success: true };
        }
      } catch (parseError) {
        console.log('Response was not JSON, assuming success');
        result = { success: true };
      }

      console.log('Review submission result:', result);

      Alert.alert(
        'Success',
        'Your review has been submitted successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting review:', error);
      
      // For development/testing, show more detailed error info
      Alert.alert(
        'Submission Error', 
        `Failed to submit review: ${error.message}`,
        [
          { text: 'OK' },
          { 
            text: 'Try Mock Submit', 
            onPress: () => {
              // Mock successful submission for testing
              console.log('Mock submission successful');
              Alert.alert(
                'Mock Success',
                'Review submitted successfully (mock mode)',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            }
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={32}
              color={star <= rating ? '#FFD700' : '#DDD'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Add Review',
          headerBackTitle: 'Back'
        }} 
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {/* Restaurant Info */}
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>{restaurantName}</Text>
            {address ? (
              <Text style={styles.restaurantAddress} numberOfLines={2}>
                {address}
              </Text>
            ) : null}
          </View>

          {/* Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rating *</Text>
            {renderStars()}
            <Text style={styles.ratingText}>
              {rating > 0 ? `${rating}/5 stars` : 'Tap to rate'}
            </Text>
          </View>

          {/* Price Range */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price Range</Text>
            <View style={styles.priceContainer}>
              {priceOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.priceChip,
                    price === option.value && styles.priceChipSelected
                  ]}
                  onPress={() => setPrice(price === option.value ? '' : option.value)}
                >
                  <Text style={[
                    styles.priceChipText,
                    price === option.value && styles.priceChipTextSelected
                  ]}>
                    {option.value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Review Text */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Review</Text>
            <TextInput
              style={styles.reviewInput}
              value={review}
              onChangeText={setReview}
              placeholder="Share your experience at this restaurant..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Images */}
          <View style={styles.section}>
            <View style={styles.imagesHeader}>
              <Text style={styles.sectionTitle}>Food Images</Text>
              <TouchableOpacity style={styles.addImageButton} onPress={showImagePicker}>
                <Ionicons name="camera-outline" size={20} color="#007AFF" />
                <Text style={styles.addImageText}>Add Photos</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Camera Button */}
            <TouchableOpacity style={styles.quickCameraButton} onPress={takePhoto}>
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.quickCameraText}>Take Photo</Text>
            </TouchableOpacity>

            {images.length > 0 && (
              <View style={styles.imagesContainer}>
                {images.map((image, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image source={{ uri: image }} style={styles.reviewImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, (loading || rating === 0) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading || rating === 0}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-outline" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Submit Review</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  restaurantInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#25292e',
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#25292e',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
  priceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priceChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  priceChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  priceChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  priceChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 100,
  },
  imagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  addImageText: {
    color: '#007AFF',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  quickCameraButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  quickCameraText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageContainer: {
    position: 'relative',
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  submitButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});