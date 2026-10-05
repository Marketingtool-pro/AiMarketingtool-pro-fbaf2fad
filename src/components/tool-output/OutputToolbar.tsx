import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { actionReducer, hasOutput, statusOf, type ActionStates } from './actionState';
import { copyText, exportTxt } from './exportOutput';

/**
 * OutputToolbar — where a tool run finishes (tool-UI blueprint, shared component).
 *
 * Copy and Export .txt work on their own. Share, Like and Save only appear when the
 * screen passes a handler, so a button is never shown for an action that can't work.
 * Every action has its own idle → loading → success / error state, and every action
 * is disabled until there is output. Colours come from constants/theme only.
 */

const RESET_MS = 2000;

interface Props {
  output: string | null | undefined;
  /** Used for the exported file name. */
  fileName?: string;
  onShare?: () => Promise<void> | void;
  onLike?: () => Promise<void> | void;
  liked?: boolean;
  onSave?: () => Promise<void> | void;
  saved?: boolean;
}

interface ButtonProps {
  id: string;
  label: string;
  doneLabel?: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  status: ReturnType<typeof statusOf>;
  active?: boolean;
  activeColor?: string;
  disabled: boolean;
  onPress: () => void;
}

function ActionButton({ id, label, doneLabel, icon, status, active, activeColor, disabled, onPress }: ButtonProps) {
  const color =
    status === 'error'
      ? Colors.error
      : status === 'success' || active
        ? activeColor || Colors.success
        : Colors.textSecondary;
  const text = status === 'error' ? 'Failed' : status === 'success' ? doneLabel || label : label;
  return (
    <TouchableOpacity
      testID={`output-action-${id}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || status === 'loading', busy: status === 'loading' }}
      style={[styles.btn, disabled && styles.disabled]}
      disabled={disabled || status === 'loading'}
      onPress={onPress}
    >
      {status === 'loading' ? (
        <ActivityIndicator size="small" color={Colors.textSecondary} style={styles.spinner} />
      ) : (
        <Feather name={status === 'success' ? 'check' : status === 'error' ? 'alert-triangle' : icon} size={20} color={color} />
      )}
      <Text style={[styles.text, { color }]}>{text}</Text>
    </TouchableOpacity>
  );
}

const OutputToolbar: React.FC<Props> = ({ output, fileName = 'result', onShare, onLike, liked, onSave, saved }) => {
  const [states, dispatch] = useReducer(actionReducer, {} as ActionStates);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const disabled = !hasOutput(output);

  useEffect(() => {
    const pending = timers.current;
    return () => Object.values(pending).forEach(clearTimeout);
  }, []);

  const run = useCallback(async (key: string, fn: () => Promise<void> | void, flash = true) => {
    clearTimeout(timers.current[key]);
    dispatch({ type: 'start', key });
    try {
      await fn();
      if (flash) {
        dispatch({ type: 'success', key });
        timers.current[key] = setTimeout(() => dispatch({ type: 'reset', key }), RESET_MS);
      } else {
        dispatch({ type: 'reset', key });
      }
    } catch (e: any) {
      dispatch({ type: 'error', key, message: e?.message });
      timers.current[key] = setTimeout(() => dispatch({ type: 'reset', key }), RESET_MS * 2);
    }
  }, []);

  const text = output || '';

  return (
    <View style={styles.row} accessibilityRole="toolbar">
      <ActionButton
        id="copy"
        label="Copy"
        doneLabel="Copied!"
        icon="copy"
        status={statusOf(states, 'copy')}
        disabled={disabled}
        onPress={() => run('copy', () => copyText(text))}
      />
      <ActionButton
        id="txt"
        label="Export"
        icon="file-text"
        status={statusOf(states, 'txt')}
        disabled={disabled}
        onPress={() => run('txt', () => exportTxt(text, fileName), false)}
      />
      {onShare && (
        <ActionButton
          id="share"
          label="Share"
          icon="share-2"
          status={statusOf(states, 'share')}
          disabled={disabled}
          onPress={() => run('share', onShare, false)}
        />
      )}
      {onLike && (
        <ActionButton
          id="like"
          label={liked ? 'Liked' : 'Like'}
          icon="heart"
          status={statusOf(states, 'like')}
          active={liked}
          activeColor={Colors.error}
          disabled={disabled}
          onPress={() => run('like', onLike, false)}
        />
      )}
      {onSave && (
        <ActionButton
          id="save"
          label={saved ? 'Saved' : 'Save'}
          doneLabel="Saved"
          icon={saved ? 'check' : 'bookmark'}
          status={statusOf(states, 'save')}
          active={saved}
          disabled={disabled}
          onPress={() => run('save', onSave)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  btn: {
    alignItems: 'center',
    gap: 4,
    minWidth: 48,
  },
  disabled: {
    opacity: 0.4,
  },
  spinner: {
    height: 20,
  },
  text: {
    fontSize: 12,
  },
});

export default OutputToolbar;
