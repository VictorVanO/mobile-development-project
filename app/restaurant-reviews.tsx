import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/contexts/AuthContext';

// Web API base URL
const WEB_API_BASE_URL = 'http://192.168.88.34:3000';

interface Review {
  id: number;
  review: string | null;
  rating: number | null;
  price: string | null;
  visitedAt: string;
  user: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  restaurant: {
    id: number;
    name: string;
    address: string | null;
    latitude: number;
    longitude: number;
  };
  images: Array<{
    id: number;
    url: string;
  }>;
  companions: Array<{
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
  }>;
}

export default function RestaurantReviewsScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Restaurant info from params
  const restaurantName = params.restaurantName as string || 'Restaurant';
  const latitude = parseFloat(params.latitude as string || '0');
  const longitude = parseFloat(params.longitude as string || '0');
  const address = params.address as string || '';

  const fetchReviews = async () => {
    try {
      // First, try the existing reviews API endpoint
      const url = new URL(`${WEB_API_BASE_URL}/api/reviews`);
      url.searchParams.append('name', restaurantName);
      url.searchParams.append('latitude', latitude.toString());
      url.searchParams.append('longitude', longitude.toString());

      console.log('Fetching reviews from:', url.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        // If the specific restaurant reviews endpoint doesn't work,
        // try the recent reviews endpoint and filter
        console.log('Trying fallback to recent reviews...');
        
        const fallbackResponse = await fetch(`${WEB_API_BASE_URL}/api/reviews`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        if (!fallbackResponse.ok) {
          throw new Error(`HTTP error! status: ${fallbackResponse.status}`);
        }

        const allReviews = await fallbackResponse.json();
        console.log('All reviews received:', allReviews.length);

        // Filter reviews for this specific restaurant (approximate location matching)
        const filteredReviews = allReviews.filter((review: any) => {
          const latDiff = Math.abs(review.restaurant.latitude - latitude);
          const lonDiff = Math.abs(review.restaurant.longitude - longitude);
          const nameMatch = review.restaurant.name.toLowerCase().includes(restaurantName.toLowerCase()) ||
                           restaurantName.toLowerCase().includes(review.restaurant.name.toLowerCase());
          
          // Match by location (within ~100 meters) or name similarity
          return (latDiff < 0.001 && lonDiff < 0.001) || nameMatch;
        });

        console.log('Filtered reviews:', filteredReviews.length);
        setReviews(filteredReviews);
        return;
      }

      const data = await response.json();
      console.log('Reviews received:', data);
      setReviews(Array.isArray(data) ? data : []);
      
    } catch (error) {
      console.error('Error fetching reviews:', error);
      
      // For development/testing, provide mock data
      console.log('Using mock data for testing...');
      const mockReviews = [
        {
          id: 1,
          review: "Great food and excellent service! The atmosphere was cozy and the staff was very friendly.",
          rating: 5,
          price: "€€",
          visitedAt: new Date().toISOString(),
          user: {
            id: 1,
            email: "user@example.com",
            firstName: "John",
            lastName: "Doe"
          },
          restaurant: {
            id: 1,
            name: restaurantName,
            address: address,
            latitude: latitude,
            longitude: longitude
          },
          images: [
            {
              id: 1,
              url: "https://via.placeholder.com/300x200/4CAF50/white?text=Delicious+Food"
            },
            {
              id: 2,
              url: "https://via.placeholder.com/300x200/FF9800/white?text=Great+Ambiance"
            }
          ],
          companions: [
            {
              id: 2,
              email: "friend@example.com",
              firstName: "Jane",
              lastName: "Smith"
            }
          ]
        },
        {
          id: 2,
          review: "The food was okay, but the service could be improved. The location is convenient though.",
          rating: 3,
          price: "€",
          visitedAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          user: {
            id: 3,
            email: "another@example.com",
            firstName: "Mike",
            lastName: "Johnson"
          },
          restaurant: {
            id: 1,
            name: restaurantName,
            address: address,
            latitude: latitude,
            longitude: longitude
          },
          images: [],
          companions: []
        }
      ];
      
      setReviews(mockReviews);
    }
  };

  useEffect(() => {
    const loadReviews = async () => {
      setLoading(true);
      await fetchReviews();
      setLoading(false);
    };

    loadReviews();
  }, [restaurantName, latitude, longitude]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReviews();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color={i <= rating ? '#FFD700' : '#DDD'}
        />
      );
    }
    return stars;
  };

  const getUserDisplayName = (user: Review['user']) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email;
  };

  const getCompanionsText = (companions: Review['companions']) => {
    if (!companions || companions.length === 0) return null;
    
    return companions.map(c => 
      c.firstName && c.lastName ? `${c.firstName} ${c.lastName}` : c.email
    ).join(', ');
  };

  const averageRating = () => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    return (total / reviews.length).toFixed(1);
  };

  const handleAddReview = () => {
    if (!user) {
      router.push('/login');
      return;
    }

    router.push({
      pathname: '/add-review',
      params: {
        restaurantName,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        address,
      }
    });
  };

  if (loading) {
    return (
      <>
        <Stack.Screen 
          options={{ 
            title: 'Restaurant Reviews',
            headerBackTitle: 'Back'
          }} 
        />
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Restaurant Reviews',
          headerBackTitle: 'Back'
        }} 
      />
      
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Restaurant Header */}
        <View style={styles.restaurantHeader}>
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>{restaurantName}</Text>
            {address && (
              <Text style={styles.restaurantAddress} numberOfLines={2}>
                {address}
              </Text>
            )}
          </View>

          {reviews.length > 0 && (
            <View style={styles.ratingInfo}>
              <View style={styles.averageRating}>
                <View style={styles.starsRow}>
                  {renderStars(Math.round(parseFloat(averageRating())))}
                </View>
                <Text style={styles.averageRatingText}>
                  {averageRating()}/5
                </Text>
              </View>
              <Text style={styles.reviewCount}>
                {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Add Review Button */}
        <View style={styles.addReviewContainer}>
          <TouchableOpacity style={styles.addReviewButton} onPress={handleAddReview}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.addReviewButtonText}>
              {user ? 'Add Your Review' : 'Sign In to Add Review'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Reviews List */}
        <View style={styles.reviewsContainer}>
          {reviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={48} color="#DDD" />
              <Text style={styles.emptyStateTitle}>No reviews yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Be the first to share your experience at this restaurant!
              </Text>
            </View>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                {/* Review Header */}
                <View style={styles.reviewHeader}>
                  <View style={styles.userInfo}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {getUserDisplayName(review.user)[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={styles.userName}>
                        {getUserDisplayName(review.user)}
                      </Text>
                      <Text style={styles.reviewDate}>
                        {formatDate(review.visitedAt)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.reviewActions}>
                    <View style={styles.ratingContainer}>
                      <View style={styles.starsRow}>
                        {renderStars(review.rating || 0)}
                      </View>
                      {review.price && (
                        <Text style={styles.priceText}>{review.price}</Text>
                      )}
                    </View>
                    
                    {/* Show edit button only for user's own reviews */}
                    {user && review.user.email === user.email && (
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => router.push({
                          pathname: '/edit-review',
                          params: {
                            reviewId: review.id.toString(),
                            restaurantName: review.restaurant.name,
                            latitude: review.restaurant.latitude.toString(),
                            longitude: review.restaurant.longitude.toString(),
                            address: review.restaurant.address || '',
                            rating: review.rating?.toString() || '0',
                            review: review.review || '',
                            price: review.price || '',
                          }
                        })}
                      >
                        <Ionicons name="pencil-outline" size={18} color="#007AFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Review Content */}
                {review.review && (
                  <Text style={styles.reviewText}>{review.review}</Text>
                )}

                {/* Review Images */}
                {review.images && review.images.length > 0 && (
                  <ScrollView 
                    horizontal 
                    style={styles.imagesContainer}
                    showsHorizontalScrollIndicator={false}
                  >
                    {review.images.map((image) => (
                      <Image
                        key={image.id}
                        source={{ uri: image.url }}
                        style={styles.reviewImage}
                      />
                    ))}
                  </ScrollView>
                )}

                {/* Companions */}
                {review.companions && review.companions.length > 0 && (
                  <View style={styles.companionsContainer}>
                    <Ionicons name="people-outline" size={16} color="#666" />
                    <Text style={styles.companionsText}>
                      with {getCompanionsText(review.companions)}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
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
  restaurantHeader: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  restaurantInfo: {
    marginBottom: 16,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#25292e',
    marginBottom: 8,
  },
  restaurantAddress: {
    fontSize: 16,
    color: '#666',
    lineHeight: 20,
  },
  ratingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  averageRating: {
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  averageRatingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#25292e',
  },
  reviewCount: {
    fontSize: 14,
    color: '#666',
  },
  addReviewContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  addReviewButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  addReviewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  reviewsContainer: {
    paddingHorizontal: 16,
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  reviewCard: {
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
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#25292e',
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
  },
  reviewActions: {
    alignItems: 'flex-end',
  },
  editButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#B3D9FF',
    marginTop: 8,
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginTop: 4,
  },
  reviewText: {
    fontSize: 15,
    color: '#25292e',
    lineHeight: 20,
    marginBottom: 12,
  },
  imagesContainer: {
    marginBottom: 12,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  companionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  companionsText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
});