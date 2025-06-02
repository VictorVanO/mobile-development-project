import React, { useState, useEffect } from 'react';
import { 
  Text, 
  View, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator 
} from 'react-native';
import { Link } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

// Web API base URL - should match your server
const WEB_API_BASE_URL = 'http://192.168.88.34:3000'; // Adjust to match your server IP

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

export default function Index() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentReviews = async () => {
    try {
      const response = await fetch(`${WEB_API_BASE_URL}/api/reviews`);
      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }
      const data = await response.json();
      setReviews(data.slice(0, 10)); // Limit to 10 most recent
      setError(null);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Unable to load reviews. Please check your connection.');
    }
  };

  useEffect(() => {
    const loadReviews = async () => {
      setLoading(true);
      await fetchRecentReviews();
      setLoading(false);
    };

    loadReviews();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecentReviews();
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

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading recent reviews...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => {
          setError(null);
          setLoading(true);
          fetchRecentReviews().finally(() => setLoading(false));
        }}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>EatReal.</Text>
        <Text style={styles.subtitle}>Discover great restaurants through real reviews</Text>
      </View>

      {/* Recent Reviews Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Reviews</Text>
          <Ionicons name="time-outline" size={20} color="#666" />
        </View>

        {reviews.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color="#DDD" />
            <Text style={styles.emptyStateText}>No reviews yet</Text>
            <Text style={styles.emptyStateSubtext}>Be the first to share your dining experience!</Text>
          </View>
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              {/* Restaurant Info */}
              <View style={styles.restaurantHeader}>
                <View style={styles.restaurantInfo}>
                  <Text style={styles.restaurantName}>{review.restaurant.name}</Text>
                  {review.restaurant.address && (
                    <Text style={styles.restaurantAddress} numberOfLines={1}>
                      {review.restaurant.address}
                    </Text>
                  )}
                </View>
                <View style={styles.ratingContainer}>
                  <View style={styles.stars}>
                    {renderStars(review.rating || 0)}
                  </View>
                  {review.price && (
                    <Text style={styles.priceText}>{review.price}</Text>
                  )}
                </View>
              </View>

              {/* Review Content */}
              {review.review && (
                <Text style={styles.reviewText} numberOfLines={3}>
                  {review.review}
                </Text>
              )}

              {/* Images */}
              {review.images && review.images.length > 0 && (
                <ScrollView horizontal style={styles.imagesContainer} showsHorizontalScrollIndicator={false}>
                  {review.images.slice(0, 3).map((image) => (
                    <Image
                      key={image.id}
                      source={{ uri: image.url }}
                      style={styles.reviewImage}
                    />
                  ))}
                  {review.images.length > 3 && (
                    <View style={styles.moreImagesIndicator}>
                      <Text style={styles.moreImagesText}>+{review.images.length - 3}</Text>
                    </View>
                  )}
                </ScrollView>
              )}

              {/* Review Footer */}
              <View style={styles.reviewFooter}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {getUserDisplayName(review.user)}
                  </Text>
                  {review.companions && review.companions.length > 0 && (
                    <Text style={styles.companionsText}>
                      with {review.companions.map(c => 
                        c.firstName && c.lastName ? `${c.firstName} ${c.lastName}` : c.email
                      ).join(', ')}
                    </Text>
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

      {/* Call to Action */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaTitle}>Share Your Experience</Text>
        <Text style={styles.ctaSubtitle}>Join EatReal to discover and review restaurants</Text>
        <View style={styles.ctaButtons}>
          <Link href="/login" asChild>
            <TouchableOpacity style={styles.ctaButton}>
              <Text style={styles.ctaButtonText}>Get Started</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
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
  header: {
    backgroundColor: '#25292e',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#25292e',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    marginVertical: 10,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  restaurantHeader: {
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#25292e',
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#666',
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  stars: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  priceText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
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
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  moreImagesIndicator: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#25292e',
    marginBottom: 2,
  },
  companionsText: {
    fontSize: 12,
    color: '#666',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  ctaSection: {
    backgroundColor: '#fff',
    padding: 24,
    margin: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#25292e',
    marginBottom: 8,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  ctaButtons: {
    flexDirection: 'row',
  },
  ctaButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});