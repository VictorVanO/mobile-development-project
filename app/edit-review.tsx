import React, { useState, useEffect } from 'react';
import { buildApiUrl, API_CONFIG } from '@/lib/config';
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
// const WEB_API_BASE_URL = 'http://192.168.88.34:3000';

interface ReviewImage {
  id: number;
  url: string;
}

export default function EditReviewScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  
  // Form state
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [price, setPrice] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<ReviewImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Review info from params
  const reviewId = parseInt(params.reviewId as string || '0');
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

  // Load existing review data - ONLY ONCE
  useEffect(() => {
    const loadReviewData = async () => {
      try {
        if (!user) {
          Alert.alert('Error', 'You must be logged in to edit reviews.');
          router.back();
          return;
        }

        // Only load from params once at the beginning
        if (!dataLoaded) {
          // Load data from params first for immediate display
          const paramRating = parseInt(params.rating as string || '0');
          const paramReview = params.review as string || '';
          const paramPrice = params.price as string || '';
          
          setRating(paramRating);
          setReview(paramReview);
          setPrice(paramPrice);
          
          console.log('Loaded from params:', { paramRating, paramReview, paramPrice });
        }
        
        // Fetch full review data from API for images and verification

        const response = await fetch(buildApiUrl(`/api/reviews/${reviewId}`), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Email': user.email,
          },
        });

        if (response.ok) {
          const reviewData = await response.json();
          
          // Verify user ownership
          if (reviewData.user.email !== user.email && !user.admin) {
            Alert.alert('Error', 'You can only edit your own reviews.');
            router.back();
            return;
          }

          // Only update state with API data if we haven't loaded params data yet
          if (!dataLoaded) {
            setRating(reviewData.rating || 0);
            setReview(reviewData.review || '');
            setPrice(reviewData.price || '');
            
            console.log('Updated from API:', {
              rating: reviewData.rating,
              review: reviewData.review,
              price: reviewData.price
            });
          }
          
          // Always update images from API
          if (reviewData.images && reviewData.images.length > 0) {
            setExistingImages(reviewData.images);
          }
          
          setDataLoaded(true);
        } else if (response.status === 404) {
          Alert.alert('Error', 'Review not found.');
          router.back();
          return;
        } else if (response.status === 403) {
          Alert.alert('Error', 'You are not authorized to edit this review.');
          router.back();
          return;
        } else {
          // If API fails, use params data
          if (!dataLoaded) {
            const paramRating = parseInt(params.rating as string || '0');
            const paramReview = params.review as string || '';
            const paramPrice = params.price as string || '';
            
            setRating(paramRating);
            setReview(paramReview);
            setPrice(paramPrice);
            setDataLoaded(true);
            
            console.log('Using params data due to API error');
          }
        }
      } catch (error) {
        console.error('Error loading review data:', error);
        
        // Fallback to params data
        if (!dataLoaded) {
          const paramRating = parseInt(params.rating as string || '0');
          const paramReview = params.review as string || '';
          const paramPrice = params.price as string || '';
          
          setRating(paramRating);
          setReview(paramReview);
          setPrice(paramPrice);
          setDataLoaded(true);
          
          console.log('Using params data due to error:', { paramRating, paramReview, paramPrice });
        }
        
        Alert.alert('Warning', 'Failed to load some review data. You can still edit using the current information.');
      } finally {
        setInitialLoading(false);
      }
    };

    if (reviewId > 0 && !dataLoaded) {
      loadReviewData();
    } else if (reviewId === 0) {
      setInitialLoading(false);
    }
  }, [reviewId, user, dataLoaded]);

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

  const removeImage = (index: number, isExisting: boolean = false) => {
    if (isExisting) {
      setExistingImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleRatingChange = (newRating: number) => {
    console.log('Rating changed to:', newRating);
    setRating(newRating);
  };

  const handleReviewChange = (newReview: string) => {
    console.log('Review text changed to:', newReview);
    setReview(newReview);
  };

  const handlePriceChange = (newPrice: string) => {
    console.log('Price changed to:', newPrice);
    setPrice(newPrice === price ? '' : newPrice);
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to edit a review.');
      return;
    }

    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating.');
      return;
    }

    if (reviewId === 0) {
      Alert.alert('Error', 'Invalid review ID.');
      return;
    }

    setLoading(true);

    try {
      console.log('Updating review with data:', {
        reviewId,
        rating,
        review,
        price,
        userEmail: user.email,
        newImagesCount: images.length,
        existingImagesCount: existingImages.length
      });

      // Create FormData
      const formData = new FormData();
      formData.append('rating', rating.toString());
      formData.append('review', review);
      formData.append('price', price);

      // Add all images (existing + new)
      // First add existing images
      existingImages.forEach((image) => {
        formData.append('imageUrls', image.url);
      });
      
      // Then add new images
      images.forEach((image) => {
        formData.append('imageUrls', image);
      });

      
      const apiUrl = buildApiUrl(`/api/reviews/${reviewId}`);
      console.log('Making API request to:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'PUT',
        body: formData,
        headers: {
          'X-User-Email': user.email,
          // Don't set Content-Type header when using FormData
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        if (response.status === 403) {
          throw new Error('You are not authorized to edit this review.');
        } else if (response.status === 404) {
          throw new Error('Review not found.');
        } else {
          throw new Error(`Failed to update review (${response.status})`);
        }
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

      console.log('Review update result:', result);

      Alert.alert(
        'Success',
        'Your review has been updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to my reviews to see the updated review
              router.replace('/my-reviews');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error updating review:', error);
      Alert.alert('Update Error', error.message || 'Failed to update review. Please try again.');
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
            onPress={() => handleRatingChange(star)}
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

  if (initialLoading) {
    return (
      <>
        <Stack.Screen 
          options={{ 
            title: 'Edit Review',
            headerBackTitle: 'Back'
          }} 
        />
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading review...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Edit Review',
          headerBackTitle: 'Back'
        }} 
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {/* Debug info - remove in production */}
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>
              Current values - Rating: {rating}, Price: '{price}', Review length: {review.length}
            </Text>
          </View>

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
                  onPress={() => handlePriceChange(option.value)}
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
              onChangeText={handleReviewChange}
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

            {/* Existing Images */}
            {existingImages.length > 0 && (
              <>
                <Text style={styles.imagesSectionTitle}>Current Images:</Text>
                <View style={styles.imagesContainer}>
                  {existingImages.map((image, index) => (
                    <View key={`existing-${index}`} style={styles.imageContainer}>
                      <Image source={{ uri: image.url }} style={styles.reviewImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index, true)}
                      >
                        <Ionicons name="close-circle" size={24} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* New Images */}
            {images.length > 0 && (
              <>
                <Text style={styles.imagesSectionTitle}>New Images:</Text>
                <View style={styles.imagesContainer}>
                  {images.map((image, index) => (
                    <View key={`new-${index}`} style={styles.imageContainer}>
                      <Image source={{ uri: image }} style={styles.reviewImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index, false)}
                      >
                        <Ionicons name="close-circle" size={24} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
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
                <Text style={styles.submitButtonText}>Update Review</Text>
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  content: {
    padding: 16,
  },
  debugContainer: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
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
  imagesSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 8,
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
    backgroundColor: '#007AFF',
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