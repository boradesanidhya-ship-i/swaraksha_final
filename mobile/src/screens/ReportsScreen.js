import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Colors, Shadows } from '../theme/colors';
import { FileText, ShieldAlert, ShieldCheck, Mail, Send, RefreshCw, Clock, CheckCircle2, AlertTriangle } from 'lucide-react-native';
import { fetchReportHistory, resendReportEmail, sendTestEmail } from '../api/client';

export default function ReportsScreen({ userEmail, onSelectReport }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [emailingId, setEmailingId] = useState(null);
  const [testingEmail, setTestingEmail] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const data = await fetchReportHistory(userEmail);
      setReports(data || []);
    } catch (e) {
      console.error('Error fetching reports:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userEmail]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleTestEmail = async () => {
    if (!userEmail) {
      Alert.alert('Email Missing', 'No registered email address found in session.');
      return;
    }
    setTestingEmail(true);
    try {
      const res = await sendTestEmail(userEmail);
      Alert.alert(
        'Email Sent!',
        `A test verification email has been delivered to ${userEmail}. Please check your inbox (and spam folder).`
      );
    } catch (e) {
      const detail = e.response?.data?.detail || e.message || 'Failed to send test email.';
      Alert.alert(
        'Email Configuration Notice',
        `${detail}\n\nTo configure live email delivery:\n1. Open your .env file\n2. Set SMTP_USER=your_email@gmail.com\n3. Set SMTP_PASSWORD=your_16_char_app_password`
      );
    } finally {
      setTestingEmail(false);
    }
  };

  const handleResendEmail = async (reportId) => {
    setEmailingId(reportId);
    try {
      await resendReportEmail(reportId, userEmail);
      Alert.alert('Report Dispatched', `Forensic report #${reportId} has been sent to ${userEmail || 'your email'}.`);
      loadReports();
    } catch (e) {
      const detail = e.response?.data?.detail || e.message || 'Could not send email.';
      Alert.alert('Email Dispatch Info', detail);
    } finally {
      setEmailingId(null);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerBanner}>
      <View style={styles.bannerRow}>
        <View style={styles.bannerIcon}>
          <Mail size={20} color={Colors.primary} />
        </View>
        <View style={styles.bannerTextContainer}>
          <Text style={styles.bannerTitle}>Automated Email Delivery</Text>
          <Text style={styles.bannerSubtitle} numberOfLines={1}>
            Reports auto-dispatched to: <Text style={styles.emailHighlight}>{userEmail || 'Registered User'}</Text>
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.testEmailButton, testingEmail && styles.testEmailButtonDisabled]}
        onPress={handleTestEmail}
        disabled={testingEmail}
        activeOpacity={0.8}
      >
        {testingEmail ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <View style={styles.testEmailContent}>
            <Send size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.testEmailText}>Send Test Verification Email</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => {
    const isThreat = item.action_verdict === 'BLOCK' || item.action_verdict === 'POTENTIAL_AI_MANIPULATION';
    const isClear = item.action_verdict === 'ALLOW' || item.action_verdict === 'NO_THREAT_DETECTED';

    return (
      <View style={styles.reportCard}>
        <View style={styles.cardHeader}>
          <View style={styles.typeBadge}>
            <FileText size={14} color={Colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.typeText}>{item.report_type.replace('_', ' ')}</Text>
          </View>

          <View style={[
            styles.verdictBadge,
            isThreat && styles.verdictBadgeThreat,
            isClear && styles.verdictBadgeClear
          ]}>
            {isThreat ? (
              <ShieldAlert size={12} color="#DC2626" style={{ marginRight: 4 }} />
            ) : (
              <ShieldCheck size={12} color="#16A34A" style={{ marginRight: 4 }} />
            )}
            <Text style={[
              styles.verdictText,
              isThreat && { color: '#DC2626' },
              isClear && { color: '#16A34A' }
            ]}>
              {item.action_verdict}
            </Text>
          </View>
        </View>

        <Text style={styles.summaryText}>{item.summary}</Text>

        <View style={styles.footerRow}>
          <View style={styles.dateRow}>
            <Clock size={12} color={Colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={styles.dateText}>{item.created_at ? new Date(item.created_at).toLocaleString() : 'Recent'}</Text>
          </View>

          <TouchableOpacity
            style={[styles.emailButton, item.email_sent && styles.emailButtonSent]}
            onPress={() => handleResendEmail(item.id)}
            disabled={emailingId === item.id}
            activeOpacity={0.7}
          >
            {emailingId === item.id ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Mail size={13} color={item.email_sent ? '#16A34A' : Colors.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.emailButtonText, item.email_sent && { color: '#16A34A' }]}>
                  {item.email_sent ? 'Sent to Inbox' : 'Resend Email'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading database scan reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reports}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={renderHeader}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadReports();
            }}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FileText size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Scan Reports Recorded</Text>
            <Text style={styles.emptySubtitle}>
              Run a Face Scan or Video Lab scan to automatically generate and receive reports via email.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  headerBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Shadows.sm,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emailHighlight: {
    fontWeight: '700',
    color: Colors.primary,
  },
  testEmailButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testEmailButtonDisabled: {
    opacity: 0.7,
  },
  testEmailContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testEmailText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFFBEB',
  },
  verdictBadgeThreat: {
    backgroundColor: '#FEF2F2',
  },
  verdictBadgeClear: {
    backgroundColor: '#F0FDF4',
  },
  verdictText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  summaryText: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  emailButtonSent: {
    backgroundColor: '#F0FDF4',
  },
  emailButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 16,
  },
});
