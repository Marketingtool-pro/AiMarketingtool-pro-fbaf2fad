sed -i.bak -e '/const renderNotification = ({ item/i\
  useEffect(() => {\
    checkPermission();\
    loadNotifications();\
  }, []);\
' src/screens/profile/NotificationsScreen.tsx
