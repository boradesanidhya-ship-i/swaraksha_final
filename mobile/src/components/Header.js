import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { Settings, ShieldCheck, ShieldAlert, LogOut, User } from 'lucide-react-native';

export default function Header({
  title,
  subtitle,
  backendOnline,
  serverUrl,
  currentUser,
  onLogout,
  onOpenSettings,
  onGoHome,
}) {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.brandRow} onPress={onGoHome} activeOpacity={0.8}>
          <Image
            source={require('../../assets/icon2.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.brandTextContainer}>
            <Text style={styles.brandTitle}>SWARAKSHA</Text>
            <Text style={styles.brandSubtitle}>identity protection</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionsRow}>
          {currentUser && (
            <View style={styles.userBadge}>
              <User size={12} color={Colors.primary} />
              <Text style={styles.userEmailText} numberOfLines={1}>
                {currentUser.full_name || currentUser.email?.split('@')[0]}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.statusBadge, backendOnline ? styles.statusOnline : styles.statusOffline]}
            onPress={onOpenSettings}
            activeOpacity={0.7}
          >
            {backendOnline ? (
              <ShieldCheck size={14} color={Colors.successText} />
            ) : (
              <ShieldAlert size={14} color={Colors.dangerText} />
            )}
            <Text
              style={[
                styles.statusText,
                backendOnline ? styles.statusTextOnline : styles.statusTextOffline,
              ]}
              numberOfLines={1}
            >
              {backendOnline ? 'Online' : 'Offline'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={onOpenSettings}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Settings size={17} color={Colors.primary} />
          </TouchableOpacity>

          {currentUser && onLogout && (
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={onLogout}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <LogOut size={16} color={Colors.dangerText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {title && (
        <View style={styles.screenHeader}>
          {subtitle && <Text style={styles.eyebrowText}>{subtitle.toUpperCase()}</Text>}
          <Text style={styles.screenTitle}>{title}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 32,
    height: 32,
  },
  brandTextContainer: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Colors.primaryDark,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.lilac,
    marginTop: -2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lilacSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    maxWidth: 90,
  },
  userEmailText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
    borderWidth: 1,
  },
  statusOnline: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.successBorder,
  },
  statusOffline: {
    backgroundColor: Colors.dangerLight,
    borderColor: Colors.dangerBorder,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextOnline: {
    color: Colors.successText,
  },
  statusTextOffline: {
    color: Colors.dangerText,
  },
  settingsButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.lilacSubtle,
  },
  logoutButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.dangerLight,
  },
  screenHeader: {
    marginTop: 10,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: Colors.lilac,
    marginBottom: 2,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
});
