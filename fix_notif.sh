sed -i.bak -e '/const clearAll = async () => {/i\
  useEffect(() => {\
    checkPermission();\
    loadNotifications();\
  }, []);\
' src/screens/profile/NotificationsScreen.tsx
