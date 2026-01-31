import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Colors, Typography, Spacing } from '../../theme/theme';

export function AddTeamMemberScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [usernameQuery, setUsernameQuery] = React.useState('');
  const [searchError, setSearchError] = React.useState<string | null>(null);

  const { data: user } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.users.getMe(),
  });
  const trustedIds = user?.trusted_network_ids ?? [];

  const addMemberMutation = useMutation({
    mutationFn: (userId: string) => api.users.addTrustedMember(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      Alert.alert('Added', 'Member added to your team.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message || 'Could not add member.');
    },
  });

  const handleAddByUsername = async () => {
    const q = usernameQuery.trim();
    setSearchError(null);
    if (!q) {
      setSearchError('Enter a username or name.');
      return;
    }
    try {
      const result = await api.users.searchByUsername(q);
      if (result) {
        if (trustedIds.includes(result.id)) {
          setSearchError('This person is already in your team.');
          return;
        }
        addMemberMutation.mutate(result.id);
      } else {
        setSearchError('No user found. Try another username.');
      }
    } catch (e) {
      setSearchError('Search failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add team member</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.hint}>Enter their username, name, or email to add them to your team.</Text>
            <TextInput
              style={styles.input}
              placeholder="Username, name, or email"
              placeholderTextColor={Colors.textGray}
              value={usernameQuery}
              onChangeText={(t) => {
                setUsernameQuery(t);
                setSearchError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}
            <TouchableOpacity
              style={[styles.primaryButton, addMemberMutation.isPending && styles.primaryButtonDisabled]}
              onPress={handleAddByUsername}
              disabled={addMemberMutation.isPending}
              activeOpacity={0.8}
            >
              {addMemberMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Add by username</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.creamDark,
  },
  backBtn: {
    minWidth: 44,
    padding: 8,
  },
  backBtnText: {
    fontSize: 24,
    color: Colors.ivoryBlueDark,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: 18,
    color: Colors.ivoryBlueDark,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  hint: {
    fontSize: 14,
    color: Colors.textGray,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 2,
    borderColor: Colors.creamDark,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    color: Colors.ivoryBlueDark,
    backgroundColor: Colors.white,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.ivoryBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 17,
  },
});
