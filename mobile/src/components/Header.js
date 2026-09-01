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
          {/* Status Indicator */}
          <TouchableOpacity
            style={[styles.statusBadge, backendOnline ? styles.statusOnline : styles.statusOffline]}
            onPress={onOpenSettings}
            activeOpacity={0.7}
          >
            {backendOnline ? (
              <ShieldCheck size={13} color={Colors.successText} />
            ) : (
              <ShieldAlert size={13} color={Colors.dangerText} />
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

          {/* User Account / Logout Pill */}
          {currentUser && (
            <TouchableOpacity
              style={styles.userBadge}
              onPress={onLogout}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <User size={12} color={Colors.primary} />
              <Text style={styles.userEmailText} numberOfLines={1}>
                {currentUser.full_name || currentUser.email?.split('@')[0]}
              </Text>
              <LogOut size={12} color={Colors.dangerText} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          )}

          {/* Settings Button */}
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={onOpenSettings}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Settings size={16} color={Colors.primary} />
          </TouchableOpacity>
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
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
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
    width: 30,
    height: 30,
  },
  brandTextContainer: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Colors.primaryDark,
  },
  brandSubtitle: {
    fontSize: 9.5,
    fontWeight: '500',
    color: Colors.lilac,
    marginTop: -2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 12,
    gap: 3,
    maxWidth: 110,
  },
  userEmailText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.dangerText,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3.5,
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
    fontSize: 10.5,
    fontWeight: '600',
  },
  statusTextOnline: {
    color: Colors.successText,
  },
  statusTextOffline: {
    color: Colors.dangerText,
  },
  settingsButton: {
    padding: 5,
    borderRadius: 8,
    backgroundColor: Colors.lilacSubtle,
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
