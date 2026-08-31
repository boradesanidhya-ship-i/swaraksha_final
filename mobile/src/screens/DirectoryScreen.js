import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Colors, Shadows } from '../theme/colors';
import {
  Users,
  UserRound,
  Trash2,
  Check,
  ImagePlus,
  ShieldCheck,
} from 'lucide-react-native';
import BackButton from '../components/BackButton';

export default function DirectoryScreen({
  persons = [],
  recentAdds = {},
  onDeletePerson,
  onRefresh,
  onAddReference,
  onGoHome,
}) {
  const [refreshing, setRefreshing] = useState(false);

  const handlePullRefresh = async () => {
    setRefreshing(true);
    await onRefresh?.();
    setRefreshing(false);
  };

  const confirmDelete = (person) => {
    Alert.alert(
      'Remove Protected Identity',
      `Are you sure you want to remove "${person.name}" (${person.person_id}) and all their stored facial embeddings from the FAISS database?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeletePerson(person.person_id),
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handlePullRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
    >
      <BackButton onPress={onGoHome} />

      <View style={styles.headingSection}>
        <Text style={styles.kicker}>PROTECTED DIRECTORY</Text>
        <Text style={styles.title}>Registered identities</Text>
        <Text style={styles.subtitle}>
          Manage the authorized individuals currently indexed for facial recognition and deepfake inspection.
        </Text>
      </View>

      {/* Directory Content */}
      <View style={styles.directoryCard}>
        {persons.length > 0 ? (
          <View style={styles.personsList}>
            {persons.map((person) => {
              const recentCount = recentAdds[person.person_id];

              return (
                <View key={person.person_id} style={styles.personRow}>
                  <View style={styles.avatar}>
                    <UserRound size={18} color={Colors.primary} />
                  </View>

                  <View style={styles.personDetails}>
                    <Text style={styles.personName}>{person.name}</Text>
                    <Text style={styles.personMeta}>
                      ID: {person.person_id} · {person.image_count || 0} reference photos
                    </Text>
                    {recentCount && (
                      <Text style={styles.recentBadge}>
                        +{recentCount} added in latest enrollment
                      </Text>
                    )}
                  </View>

                  <View style={styles.actionsBox}>
                    <View style={styles.verifiedIcon}>
                      <Check size={14} color={Colors.successText} />
                    </View>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => confirmDelete(person)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={16} color={Colors.dangerText} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Users size={32} color={Colors.lilac} />
            </View>
            <Text style={styles.emptyTitle}>No identities registered yet</Text>
            <Text style={styles.emptySub}>
              Add reference photos to create the first protected identity in your local FAISS database.
            </Text>
            <TouchableOpacity
              style={styles.enrollButton}
              onPress={onAddReference}
              activeOpacity={0.85}
            >
              <ImagePlus size={16} color="#ffffff" />
              <Text style={styles.enrollButtonText}>Add reference images</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 50,
  },
  headingSection: {
    marginBottom: 16,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: Colors.lilac,
    marginBottom: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  directoryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  personsList: {
    padding: 8,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.lilacSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  personDetails: {
    flex: 1,
  },
  personName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  personMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  recentBadge: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  actionsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifiedIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.lilacSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  enrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  enrollButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
