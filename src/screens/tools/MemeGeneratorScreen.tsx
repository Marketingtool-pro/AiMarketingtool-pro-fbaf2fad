import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
// Template thumbnails are remote URLs — expo-image (Glide-backed on Android)
// downsamples + caches them, which is what Play Console's "bitmap image
// optimization" advice asks for. NOTE: the meme canvas below deliberately
// keeps RN's <Image>; it lives inside ViewShot, and expo-image's custom view
// does not reliably snapshot on Android.
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Colors, Gradients, Spacing, BorderRadius, HEADER_TOP_PADDING } from '../../constants/theme';


const { width, height } = Dimensions.get('window');
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Meme Templates
const MEME_TEMPLATES = [
  { id: '1', name: 'Drake', url: 'https://i.imgflip.com/30b1gx.jpg', topText: '', bottomText: '' },
  { id: '2', name: 'Distracted Boyfriend', url: 'https://i.imgflip.com/1ur9b0.jpg', topText: '', bottomText: '' },
  { id: '3', name: 'Two Buttons', url: 'https://i.imgflip.com/1g8my4.jpg', topText: '', bottomText: '' },
  { id: '4', name: 'Change My Mind', url: 'https://i.imgflip.com/24y43o.jpg', topText: '', bottomText: '' },
  { id: '5', name: 'Expanding Brain', url: 'https://i.imgflip.com/1jwhww.jpg', topText: '', bottomText: '' },
  { id: '6', name: 'Surprised Pikachu', url: 'https://i.imgflip.com/2kbn1e.jpg', topText: '', bottomText: '' },
  { id: '7', name: 'Is This A Pigeon', url: 'https://i.imgflip.com/1o00in.jpg', topText: '', bottomText: '' },
  { id: '8', name: 'Woman Yelling at Cat', url: 'https://i.imgflip.com/345v97.jpg', topText: '', bottomText: '' },
  { id: '9', name: 'Bernie Sanders', url: 'https://i.imgflip.com/4oiksn.png', topText: '', bottomText: '' },
  { id: '10', name: 'Disaster Girl', url: 'https://i.imgflip.com/23ls.jpg', topText: '', bottomText: '' },
  { id: '11', name: 'Success Kid', url: 'https://i.imgflip.com/1bhk.jpg', topText: '', bottomText: '' },
  { id: '12', name: 'One Does Not Simply', url: 'https://i.imgflip.com/1bij.jpg', topText: '', bottomText: '' },
];

// Font Styles — bundled, so a meme renders identically on both platforms.
//
// These used to be Platform.select() over SYSTEM fonts: Impact/Arial-BoldMT/
// Comic Sans MS/Times-Bold on iOS versus sans-serif-condensed/sans-serif/
// casual/serif on Android. Those are different typefaces with different
// metrics, so the same meme came out looking different depending on the
// device, and text positioned to fit on one platform could overflow on the
// other. The old "Harmonized for parity" comment was aspirational, not true.
//
// Now every option maps to a font file shipped in assets/fonts and loaded in
// App.tsx, so there is exactly one rendering. All four are SIL OFL 1.1, which
// permits redistribution inside the app.
//
//   Impact -> Anton        Arial -> Arimo (metric-compatible with Arial)
//   Comic  -> Comic Neue   Times -> Tinos (metric-compatible with Times)
const FONT_STYLES = [
  { id: 'impact', name: 'Impact', fontFamily: 'Anton-Regular' },
  { id: 'arial', name: 'Arial', fontFamily: 'Arimo-Bold' },
  { id: 'comic', name: 'Comic', fontFamily: 'ComicNeue-Bold' },
  { id: 'times', name: 'Times', fontFamily: 'Tinos-Bold' },
];

// Text Colors
const TEXT_COLORS = [
  { id: 'white', color: '#FFFFFF', name: 'White' },
  { id: 'black', color: '#000000', name: 'Black' },
  { id: 'yellow', color: '#FFFF00', name: 'Yellow' },
  { id: 'red', color: '#FF0000', name: 'Red' },
  { id: 'blue', color: '#0000FF', name: 'Blue' },
  { id: 'green', color: '#00FF00', name: 'Green' },
  { id: 'orange', color: '#FFA500', name: 'Orange' },
  { id: 'purple', color: '#800080', name: 'Purple' },
];

// Stroke Colors
const STROKE_COLORS = [
  { id: 'black', color: '#000000', name: 'Black' },
  { id: 'white', color: '#FFFFFF', name: 'White' },
  { id: 'none', color: 'transparent', name: 'None' },
];

const MemeGeneratorScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const viewShotRef = useRef<any>(null);

  // State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [middleText, setMiddleText] = useState('');
  const [selectedFont, setSelectedFont] = useState(FONT_STYLES[0]);
  const [textColor, setTextColor] = useState(TEXT_COLORS[0]);
  const [strokeColor, setStrokeColor] = useState(STROKE_COLORS[0]);
  const [fontSize, setFontSize] = useState(32);
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTextInput, setActiveTextInput] = useState<'top' | 'middle' | 'bottom'>('top');

  // Request Permissions
  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();

    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Camera and photo library access is required to create memes.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };


  // Cap the long edge of a picked/captured photo before it is ever decoded for
  // display. A full-resolution phone photo is 12MP-108MP; as an ARGB_8888
  // bitmap a 4000x3000 image is ~48 MB, and a 50MP one ~200 MB, which is what
  // Play Console flags as "excessive memory usage" and what OOM-kills the
  // screen on cheaper devices.
  //
  // No output quality is lost: the meme that gets saved or shared is a
  // react-native-view-shot capture of the on-screen view (~device resolution),
  // so anything above ~2048px was only ever costing memory.
  //
  // If manipulation fails for any reason, fall back to the original URI --
  // a large image is still better than a broken flow.
  const MAX_IMAGE_EDGE = 2048;

  const downscaleImage = async (uri: string, width?: number, height?: number) => {
    try {
      const longEdge = Math.max(width ?? 0, height ?? 0);
      // Already small enough: skip the extra decode/encode round trip.
      if (longEdge > 0 && longEdge <= MAX_IMAGE_EDGE) {
        return uri;
      }

      const isLandscape = (width ?? 0) >= (height ?? 0);
      const context = ImageManipulator.manipulate(uri).resize(
        isLandscape ? { width: MAX_IMAGE_EDGE } : { height: MAX_IMAGE_EDGE }
      );
      const image = await context.renderAsync();
      const result = await image.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.85,
      });
      return result.uri;
    } catch (error) {
      console.warn('Image downscale failed, using original:', error);
      return uri;
    }
  };

  // Pick Image from Gallery
  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        // `aspect` only applies when allowsEditing is true, so it was inert here.
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage(await downscaleImage(asset.uri, asset.width, asset.height));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Take Photo with Camera
  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        // `aspect` only applies when allowsEditing is true, so it was inert here.
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage(await downscaleImage(asset.uri, asset.width, asset.height));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  // Select Template
  // Templates are remote URLs. Handing one straight to the <Image> inside
  // ViewShot made React Native's Fresco pipeline fetch and decode it, which is
  // what Play Console reports under "bitmap image optimization":
  //
  //   Downloaded in com.facebook.imagepipeline.producers
  //                 .HttpUrlConnectionNetworkFetcher.fetchSync
  //
  // Routing through downscaleImage() instead means expo-image-manipulator does
  // the fetch natively and hands back a LOCAL file, capped at MAX_IMAGE_EDGE.
  // The canvas then renders a local file, so nothing is downloaded by <Image>
  // and the bitmap is bounded. The canvas keeps RN's <Image> because
  // expo-image's custom view does not snapshot reliably under ViewShot.
  const selectTemplate = async (template: typeof MEME_TEMPLATES[0]) => {
    setShowTemplates(false);
    setIsLoading(true);
    try {
      setSelectedImage(await downscaleImage(template.url));
    } catch {
      // downscaleImage already falls back to the original URI on failure;
      // if even that throws, use the URL so the flow is never dead-ended.
      setSelectedImage(template.url);
    } finally {
      setIsLoading(false);
    }
  };

  // Save Meme
  const saveMeme = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select an image first');
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsLoading(true);
    try {
      // Capture the meme view
      const uri = await viewShotRef.current?.capture?.();
      if (uri) {
        // Save to camera roll
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert('Success! 🎉', 'Meme saved to your gallery', [{ text: 'OK' }]);
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save meme');
    } finally {
      setIsLoading(false);
    }
  };

  // Share Meme
  const shareMeme = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select an image first');
      return;
    }

    setIsLoading(true);
    try {
      const uri = await viewShotRef.current?.capture?.();
      if (uri) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Share your meme',
          });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share meme');
    } finally {
      setIsLoading(false);
    }
  };

  // Render Meme Text with Stroke
  const renderMemeText = (text: string, position: 'top' | 'middle' | 'bottom') => {
    if (!text) return null;

    const positionStyle = 
      position === 'top' ? styles.topTextContainer :
      position === 'middle' ? styles.middleTextContainer :
      styles.bottomTextContainer;

    return (
      <View style={positionStyle}>
        {/* Shadow/Stroke layers */}
        {strokeColor.color !== 'transparent' && (
          <>
            <Text style={[
              styles.memeText,
              {
                fontFamily: selectedFont.fontFamily,
                fontSize: fontSize,
                color: strokeColor.color,
                position: 'absolute',
                left: -2,
                top: -2,
              }
            ]}>
              {text.toUpperCase()}
            </Text>
            <Text style={[
              styles.memeText,
              {
                fontFamily: selectedFont.fontFamily,
                fontSize: fontSize,
                color: strokeColor.color,
                position: 'absolute',
                left: 2,
                top: -2,
              }
            ]}>
              {text.toUpperCase()}
            </Text>
            <Text style={[
              styles.memeText,
              {
                fontFamily: selectedFont.fontFamily,
                fontSize: fontSize,
                color: strokeColor.color,
                position: 'absolute',
                left: -2,
                top: 2,
              }
            ]}>
              {text.toUpperCase()}
            </Text>
            <Text style={[
              styles.memeText,
              {
                fontFamily: selectedFont.fontFamily,
                fontSize: fontSize,
                color: strokeColor.color,
                position: 'absolute',
                left: 2,
                top: 2,
              }
            ]}>
              {text.toUpperCase()}
            </Text>
          </>
        )}
        {/* Main text */}
        <Text style={[
          styles.memeText,
          {
            fontFamily: selectedFont.fontFamily,
            fontSize: fontSize,
            color: textColor.color,
          }
        ]}>
          {text.toUpperCase()}
        </Text>
      </View>
    );
  };

  // Render Template Item
  const renderTemplateItem = ({ item }: { item: typeof MEME_TEMPLATES[0] }) => (
    <TouchableOpacity
      style={styles.templateItem}
      onPress={() => selectTemplate(item)}
    >
      <ExpoImage source={{ uri: item.url }} style={styles.templateImage} />
      <Text style={styles.templateName} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screenContainer}>
      {/* Header */}
      <LinearGradient colors={Gradients.dark} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meme Generator</Text>
          <TouchableOpacity onPress={() => setShowSettings(!showSettings)} style={styles.settingsButton}>
            <Feather name="sliders" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Meme Preview */}
        <View style={styles.previewSection}>
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1 }}
            style={styles.memeContainer}
          >
            {selectedImage ? (
              <View style={styles.memeWrapper}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.memeImage}
                  resizeMode="contain"
                />
                {renderMemeText(topText, 'top')}
                {renderMemeText(middleText, 'middle')}
                {renderMemeText(bottomText, 'bottom')}
              </View>
            ) : (
              <View style={styles.placeholderContainer}>
                <Feather name="image" size={64} color={Colors.textTertiary} />
                <Text style={styles.placeholderText}>Select an image to create your meme</Text>
              </View>
            )}
          </ViewShot>
        </View>

        {/* Image Source Buttons */}
        <View style={styles.sourceButtons}>
          <TouchableOpacity style={styles.sourceButton} onPress={pickImage}>
            <LinearGradient colors={Gradients.primary} style={styles.sourceGradient}>
              <Feather name="image" size={24} color={Colors.white} />
              <Text style={styles.sourceButtonText}>Gallery</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sourceButton} onPress={takePhoto}>
            <LinearGradient colors={Gradients.secondary} style={styles.sourceGradient}>
              <Feather name="camera" size={24} color={Colors.white} />
              <Text style={styles.sourceButtonText}>Camera</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sourceButton} onPress={() => setShowTemplates(true)}>
            <LinearGradient colors={['#FF6B6B', '#FF8E8E']} style={styles.sourceGradient}>
              <Feather name="grid" size={24} color={Colors.white} />
              <Text style={styles.sourceButtonText}>Templates</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Text Inputs */}
        <View style={styles.textInputsSection}>
          <Text style={styles.sectionTitle}>Add Text</Text>

          {/* Top Text */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Top Text</Text>
            <TextInput
              style={[
                styles.textInput,
                activeTextInput === 'top' && styles.textInputActive
              ]}
              placeholder="Enter top text..."
              placeholderTextColor={Colors.textTertiary}
              value={topText}
              onChangeText={setTopText}
              onFocus={() => setActiveTextInput('top')}
              maxLength={50}
            />
          </View>

          {/* Middle Text */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Middle Text (Optional)</Text>
            <TextInput
              style={[
                styles.textInput,
                activeTextInput === 'middle' && styles.textInputActive
              ]}
              placeholder="Enter middle text..."
              placeholderTextColor={Colors.textTertiary}
              value={middleText}
              onChangeText={setMiddleText}
              onFocus={() => setActiveTextInput('middle')}
              maxLength={50}
            />
          </View>

          {/* Bottom Text */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bottom Text</Text>
            <TextInput
              style={[
                styles.textInput,
                activeTextInput === 'bottom' && styles.textInputActive
              ]}
              placeholder="Enter bottom text..."
              placeholderTextColor={Colors.textTertiary}
              value={bottomText}
              onChangeText={setBottomText}
              onFocus={() => setActiveTextInput('bottom')}
              maxLength={50}
            />
          </View>
        </View>

        {/* Settings Panel */}
        {showSettings && (
          <View style={styles.settingsPanel}>
            <Text style={styles.sectionTitle}>Text Settings</Text>

            {/* Font Size */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Font Size: {fontSize}</Text>
              <View style={styles.fontSizeControls}>
                <TouchableOpacity
                  style={styles.sizeButton}
                  onPress={() => setFontSize(Math.max(16, fontSize - 4))}
                >
                  <Feather name="minus" size={20} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sizeButton}
                  onPress={() => setFontSize(Math.min(64, fontSize + 4))}
                >
                  <Feather name="plus" size={20} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Font Style */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Font Style</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.optionsRow}>
                {FONT_STYLES.map((font) => (
                  <TouchableOpacity
                    key={font.id}
                    style={[
                      styles.fontOption,
                      selectedFont.id === font.id && styles.optionSelected
                    ]}
                    onPress={() => setSelectedFont(font)}
                  >
                    <Text style={[
                      styles.fontOptionText,
                      { fontFamily: font.fontFamily },
                      selectedFont.id === font.id && styles.optionTextSelected
                    ]}>
                      {font.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Text Color */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Text Color</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.optionsRow}>
                {TEXT_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color.id}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color.color },
                      textColor.id === color.id && styles.colorOptionSelected
                    ]}
                    onPress={() => setTextColor(color)}
                  >
                    {textColor.id === color.id && (
                      <Feather name="check" size={20} color={color.id === 'white' ? '#000' : '#FFF'} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Stroke Color */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Stroke Color</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.optionsRow}>
                {STROKE_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color.id}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color.color === 'transparent' ? Colors.surface : color.color },
                      color.id === 'none' && styles.noStrokeOption,
                      strokeColor.id === color.id && styles.colorOptionSelected
                    ]}
                    onPress={() => setStrokeColor(color)}
                  >
                    {color.id === 'none' ? (
                      <Feather name="x" size={20} color={Colors.textSecondary} />
                    ) : strokeColor.id === color.id ? (
                      <Feather name="check" size={20} color={color.id === 'white' ? '#000' : '#FFF'} />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={saveMeme}
            disabled={isLoading || !selectedImage}
          >
            <LinearGradient
              colors={selectedImage ? Gradients.success : ['#555', '#444']}
              style={styles.actionGradient}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Feather name="download" size={24} color={Colors.white} />
                  <Text style={styles.actionButtonText}>Save</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={shareMeme}
            disabled={isLoading || !selectedImage}
          >
            <LinearGradient
              colors={selectedImage ? Gradients.primary : ['#555', '#444']}
              style={styles.actionGradient}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Feather name="share-2" size={24} color={Colors.white} />
                  <Text style={styles.actionButtonText}>Share</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Templates Modal */}
      <Modal
        visible={showTemplates}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTemplates(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Meme Templates</Text>
              <TouchableOpacity onPress={() => setShowTemplates(false)}>
                <Feather name="x" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={MEME_TEMPLATES}
              renderItem={renderTemplateItem}
              keyExtractor={(item) => item.id}
              numColumns={3}
              columnWrapperStyle={styles.templateRow}
              contentContainerStyle={styles.templatesContainer}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#0D0F1C',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: HEADER_TOP_PADDING,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  previewSection: {
    marginVertical: Spacing.lg,
    alignItems: 'center',
  },
  memeContainer: {
    width: width - Spacing.lg * 2,
    aspectRatio: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  memeWrapper: {
    flex: 1,
    position: 'relative',
  },
  memeImage: {
    width: '100%',
    height: '100%',
  },
  topTextContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    alignItems: 'center',
  },
  middleTextContainer: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    alignItems: 'center',
    transform: [{ translateY: -20 }],
  },
  bottomTextContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    alignItems: 'center',
  },
  memeText: {
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  placeholderText: {
    fontSize: 16,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  sourceButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  sourceButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  sourceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  sourceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  textInputsSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.white,
  },
  textInputActive: {
    borderColor: Colors.secondary,
  },
  settingsPanel: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  settingLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  fontSizeControls: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  sizeButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  fontOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionSelected: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  fontOptionText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  optionTextSelected: {
    color: Colors.white,
    fontWeight: '600',
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  colorOptionSelected: {
    borderColor: Colors.secondary,
    borderWidth: 3,
  },
  noStrokeOption: {
    borderStyle: 'dashed',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  templatesContainer: {
    padding: Spacing.md,
  },
  templateRow: {
    justifyContent: 'space-between',
  },
  templateItem: {
    width: (width - Spacing.md * 4) / 3,
    marginBottom: Spacing.md,
  },
  templateImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  templateName: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});

export default MemeGeneratorScreen;
