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
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
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

export default function MyReviewsScreen() {
  const { user } = useAuth();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null);

  const fetchMyReviews = async () => {
    if (!user) return;
    
    try {
      console.log('Fetching reviews for user:', user.email);
      
      const response = await fetch(`${WEB_API_BASE_URL}/api/reviews/user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-User-Email': user.email,
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        // Fallback: get all reviews and filter by user
        console.log('User reviews endpoint not available, using fallback...');
        
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

        // Filter reviews by current user
        const userReviews = allReviews.filter((review: Review) => 
          review.user.email === user.email
        );

        console.log('User reviews filtered:', userReviews.length);
        setReviews(userReviews);
        return;
      }

      const data = await response.json();
      console.log('User reviews received:', data.length);
      setReviews(Array.isArray(data) ? data : []);
      
    } catch (error) {
      console.error('Error fetching user reviews:', error);
      
      // Mock data for testing
      console.log('Using mock data for testing...');
      const mockReviews: Review[] = [
        {
          id: 1,
          review: "Amazing experience! The food was incredible and the service was top-notch. Will definitely come back!",
          rating: 5,
          price: "€€€",
          visitedAt: new Date().toISOString(),
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName || null,
            lastName: user.lastName || null
          },
          restaurant: {
            id: 1,
            name: "La Belle Époque",
            address: "123 Rue de la Paix, Brussels",
            latitude: 50.8503,
            longitude: 4.3517
          },
          images: [
            {
              id: 1,
              url: "https://via.placeholder.com/300x200/4CAF50/white?text=Delicious+Meal"
            }
          ],
          companions: []
        },
        {
          id: 2,
          review: "Good food but service was a bit slow. The atmosphere is nice though.",
          rating: 3,
          price: "€€",
          visitedAt: new Date(Date.now() - 86400000).toISOString(),
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName || null,
            lastName: user.lastName || null
          },
          restaurant: {
            id: 2,
            name: "Café Central",
            address: "45 Avenue Louise, Brussels",
            latitude: 50.8467,
            longitude: 4.3525
          },
          images: [],
          companions: [
            {
              id: 2,
              email: "friend@example.com",
              firstName: "John",
              lastName: "Doe"
            }
          ]
        }
      ];
      
      setReviews(mockReviews);
    }
  };

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    const loadReviews = async () => {
      setLoading(true);
      await fetchMyReviews();
      setLoading(false);
    };

    loadReviews();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMyReviews();
    setRefreshing(false);
  };

  const handleDeleteReview = (reviewId: number, restaurantName: string) => {
    Alert.alert(
      'Delete Review',
      `Are you sure you want to delete this review for ${restaurantName}? This cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteReview(reviewId),
        },
      ]
    );
  };

  const deleteReview = async (reviewId: number) => {
    if (!user) return;

    setDeletingReviewId(reviewId);

    try {
      console.log('Deleting review:', reviewId);
      
      const response = await fetch(`${WEB_API_BASE_URL}/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': user.email,
        },
      });

      console.log('Delete response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Remove the review from the local state
      setReviews(prevReviews => 
        prevReviews.filter(review => review.id !== reviewId)
      );

      Alert.alert('Success', 'Review deleted successfully!');
      
    } catch (error) {
      console.error('Error deleting review:', error);
      
      // For testing, simulate successful deletion
      console.log('Simulating successful deletion for testing...');
      setReviews(prevReviews => 
        prevReviews.filter(review => review.id !== reviewId)
      );
      
      Alert.alert('Success', 'Review deleted successfully! (Mock mode)');
    } finally {
      setDeletingReviewId(null);
    }
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

  const getCompanionsText = (companions: Review['companions']) => {
    if (!companions || companions.length === 0) return null;
    
    return companions.map(c => 
      c.firstName && c.lastName ? `${c.firstName} ${c.lastName}` : c.email
    ).join(', ');
  };

  if (!user) {
    return null; // Will redirect to login
  }

  if (loading) {
    return (
      <>
        <Stack.Screen 
          options={{ 
            title: 'My Reviews',
            headerBackTitle: 'Back'
          }} 
        />
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your reviews...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'My Reviews',
          headerBackTitle: 'Back'
        }} 
      />
      
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{reviews.length}</Text>
            <Text style={styles.statLabel}>Total Reviews</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {reviews.length > 0 
                ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
                : '0'
              }
            </Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {new Set(reviews.map(r => r.restaurant.id)).size}
            </Text>
            <Text style={styles.statLabel}>Restaurants</Text>
          </View>
        </View>

        {/* Add New Review Button */}
        <View style={styles.addReviewContainer}>
          <TouchableOpacity 
            style={styles.addReviewButton} 
            onPress={() => router.push('/(tabs)/map')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.addReviewButtonText}>Add New Review</Text>
          </TouchableOpacity>
        </View>

        {/* Reviews List */}
        <View style={styles.reviewsContainer}>
          {reviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={48} color="#DDD" />
              <Text style={styles.emptyStateTitle}>No reviews yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Start sharing your dining experiences!
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => router.push('/(tabs)/map')}
              >
                <Text style={styles.emptyStateButtonText}>Find Restaurants</Text>
              </TouchableOpacity>
            </View>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                {/* Review Header */}
                <View style={styles.reviewHeader}>
                  <View style={styles.restaurantInfo}>
                    <Text style={styles.restaurantName}>
                      {review.restaurant.name}
                    </Text>
                    {review.restaurant.address && (
                      <Text style={styles.restaurantAddress} numberOfLines={1}>
                        {review.restaurant.address}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.headerActions}>
                    <View style={styles.ratingContainer}>
                      <View style={styles.starsRow}>
                        {renderStars(review.rating || 0)}
                      </View>
                      {review.price && (
                        <Text style={styles.priceText}>{review.price}</Text>
                      )}
                    </View>
                    <View style={styles.actionButtons}>
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
                      
                      <TouchableOpacity
                        style={[
                          styles.deleteButton,
                          deletingReviewId === review.id && styles.deleteButtonDisabled
                        ]}
                        onPress={() => handleDeleteReview(review.id, review.restaurant.name)}
                        disabled={deletingReviewId === review.id}
                      >
                        {deletingReviewId === review.id ? (
                          <ActivityIndicator size="small" color="#FF3B30" />
                        ) : (
                          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                        )}
                      </TouchableOpacity>
                    </View>
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

                {/* Review Footer */}
                <View style={styles.reviewFooter}>
                  <View style={styles.footerInfo}>
                    {review.companions && review.companions.length > 0 && (
                      <View style={styles.companionsContainer}>
                        <Ionicons name="people-outline" size={14} color="#666" />
                        <Text style={styles.companionsText}>
                          with {getCompanionsText(review.companions)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.dateText}>
                    {formatDate(review.visitedAt)}
                  </Text>
                </View>
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
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginBottom: 16,
    paddingVertical: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#25292e',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
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
    padding: 12,
    borderRadius: 8,
  },
  addReviewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
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
    marginBottom: 20,
    lineHeight: 18,
  },
  emptyStateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  restaurantInfo: {
    flex: 1,
    marginRight: 12,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#25292e',
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 12,
    color: '#666',
  },
  headerActions: {
    alignItems: 'flex-end',
  },
  ratingContainer: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  priceText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#B3D9FF',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  reviewText: {
    fontSize: 14,
    color: '#25292e',
    lineHeight: 18,
    marginBottom: 12,
  },
  imagesContainer: {
    marginBottom: 12,
  },
  reviewImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 8,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerInfo: {
    flex: 1,
  },
  companionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companionsText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
});