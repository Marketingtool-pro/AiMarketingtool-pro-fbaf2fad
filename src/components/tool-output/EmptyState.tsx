import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

/**
 * EmptyState — one shape for "nothing here yet" (tool-UI blueprint, shared
 * component). Real empty: never filled with sample data.
 */

interface Props {
  icon?: React.ComponentProps<typeof Feather>['name'];
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<Props> = ({ icon = 'inbox', title, description, actionLabel, onAction }) => (
  <View style={styles.wrap} accessibilityRole="summary">
    <View style={styles.iconCircle}>
      <Feather name={icon} size={24} color={Colors.secondary} />
    </View>
    <Text style={styles.title}>{title}</Text>
    {description ? <Text style={styles.description}>{description}</Text> : null}
    {actionLabel && onAction ? (
      <TouchableOpacity style={styles.action} onPress={onAction} accessibilityRole="button">
        <Text style={styles.actionText}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.glassAccent,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  action: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  actionText: {
    color: Colors.secondary,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default EmptyState;
