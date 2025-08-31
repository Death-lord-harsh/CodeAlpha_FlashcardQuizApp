import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  Animated,
  Easing,
  Switch,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@flashcards_storage';

const defaultFlashcards = [
  {
    id: '1',
    question: 'What is the capital of France?',
    answer: 'Paris',
    tags: ['Geography'],
  },
  {
    id: '2',
    question: 'What is 2 + 2?',
    answer: '4',
    tags: ['Math'],
  },
];

export default function App() {
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [filterTag, setFilterTag] = useState(null);

  // Form states
  const [questionInput, setQuestionInput] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Animation for card flip
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = useState(false);

  // Interpolate rotation for front and back
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  // Load flashcards from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setFlashcards(JSON.parse(stored));
        } else {
          setFlashcards(defaultFlashcards);
        }
      } catch (e) {
        console.error('Failed to load flashcards', e);
        setFlashcards(defaultFlashcards);
      }
    })();
  }, []);

  // Save flashcards to storage on change
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(flashcards)).catch(e =>
      console.error('Failed to save flashcards', e)
    );
  }, [flashcards]);

  // Reset flip when card changes
  useEffect(() => {
    if (isFlipped) {
      flipCard();
    }
    setShowAnswer(false);
  }, [currentIndex]);

  // Filter flashcards by tag if filterTag is set
  const filteredFlashcards = filterTag
    ? flashcards.filter(card => card.tags.includes(filterTag))
    : flashcards;

  const currentCard = filteredFlashcards[currentIndex] || null;

  function flipCard() {
    if (isFlipped) {
      Animated.timing(flipAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.linear,
      }).start(() => setIsFlipped(false));
    } else {
      Animated.timing(flipAnim, {
        toValue: 180,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.linear,
      }).start(() => setIsFlipped(true));
    }
  }

  function handleShowAnswer() {
    flipCard();
    setShowAnswer(true);
  }

  function handleNext() {
    if (currentIndex < filteredFlashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }

  function handlePrevious() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  function openAddModal() {
    setEditingCard(null);
    setQuestionInput('');
    setAnswerInput('');
    setTagsInput('');
    setModalVisible(true);
  }

  function openEditModal(card) {
    setEditingCard(card);
    setQuestionInput(card.question);
    setAnswerInput(card.answer);
    setTagsInput(card.tags.join(', '));
    setModalVisible(true);
  }

  function saveCard() {
    if (!questionInput.trim() || !answerInput.trim()) {
      Alert.alert('Validation', 'Question and Answer cannot be empty.');
      return;
    }
    const tagsArray = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (editingCard) {
      // Edit existing
      setFlashcards(prev =>
        prev.map(card =>
          card.id === editingCard.id
            ? { ...card, question: questionInput, answer: answerInput, tags: tagsArray }
            : card
        )
      );
    } else {
      // Add new
      const newCard = {
        id: Date.now().toString(),
        question: questionInput,
        answer: answerInput,
        tags: tagsArray,
      };
      setFlashcards(prev => [...prev, newCard]);
      setCurrentIndex(filteredFlashcards.length); // Go to new card
    }
    setModalVisible(false);
  }

  function deleteCard(card) {
    Alert.alert(
      'Delete Flashcard',
      'Are you sure you want to delete this flashcard?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setFlashcards(prev => prev.filter(c => c.id !== card.id));
            setCurrentIndex(0);
          },
        },
      ],
      { cancelable: true }
    );
  }

  // Extract all unique tags for filter
  const allTags = Array.from(
    new Set(flashcards.reduce((acc, card) => acc.concat(card.tags), []))
  );

  // Theme styles
  const themeStyles = darkMode ? darkStyles : lightStyles;

  return (
    <SafeAreaView style={[styles.container, themeStyles.container]}>
      <View style={styles.header}>
        <Text style={[styles.title, themeStyles.text]}>Flashcards</Text>
        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, themeStyles.text]}>Dark Mode</Text>
          <Switch value={darkMode} onValueChange={setDarkMode} />
        </View>
      </View>

      {/* Tag Filter */}
      <View style={styles.tagFilterContainer}>
        <FlatList
          horizontal
          data={[null, ...allTags]}
          keyExtractor={item => (item ? item : 'all')}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const selected = item === filterTag;
            return (
              <TouchableOpacity
                onPress={() => setFilterTag(item)}
                style={[
                  styles.tagButton,
                  selected && themeStyles.tagButtonSelected,
                  { marginLeft: item === null ? 0 : 8 },
                ]}
              >
                <Text
                  style={[
                    styles.tagButtonText,
                    selected ? themeStyles.tagButtonTextSelected : themeStyles.text,
                  ]}
                >
                  {item || 'All'}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Flashcard */}
      <View style={styles.cardContainer}>
        {currentCard ? (
          <>
            <Animated.View
              style={[
                styles.card,
                themeStyles.card,
                {
                  transform: [{ rotateY: frontInterpolate }],
                  position: 'absolute',
                  backfaceVisibility: 'hidden',
                },
              ]}
            >
              <Text style={[styles.cardText, themeStyles.text]}>{currentCard.question}</Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.card,
                themeStyles.card,
                {
                  transform: [{ rotateY: backInterpolate }],
                  position: 'absolute',
                  backfaceVisibility: 'hidden',
                },
              ]}
            >
              <Text style={[styles.cardText, themeStyles.text]}>{currentCard.answer}</Text>
            </Animated.View>
          </>
        ) : (
          <Text style={[styles.noCardsText, themeStyles.text]}>No flashcards available.</Text>
        )}
      </View>

      {/* Buttons */}
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[styles.navButton, currentIndex === 0 && styles.disabledButton]}
          onPress={handlePrevious}
          disabled={currentIndex === 0}
        >
          <Text style={styles.navButtonText}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.showAnswerButton, !currentCard && styles.disabledButton]}
          onPress={handleShowAnswer}
          disabled={!currentCard}
        >
          <Text style={styles.showAnswerText}>Show Answer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            currentIndex >= filteredFlashcards.length - 1 && styles.disabledButton,
          ]}
          onPress={handleNext}
          disabled={currentIndex >= filteredFlashcards.length - 1}
        >
          <Text style={styles.navButtonText}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* Edit/Delete/Add Buttons */}
      {currentCard && (
        <View style={styles.editDeleteRow}>
          <TouchableOpacity
            style={[styles.editDeleteButton, themeStyles.editDeleteButton]}
            onPress={() => openEditModal(currentCard)}
          >
            <Text style={themeStyles.text}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.editDeleteButton, themeStyles.editDeleteButton]}
            onPress={() => deleteCard(currentCard)}
          >
            <Text style={[themeStyles.text, { color: '#d9534f' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Text style={styles.addButtonText}>+ Add Flashcard</Text>
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, themeStyles.modalContent]}>
            <Text style={[styles.modalTitle, themeStyles.text]}>
              {editingCard ? 'Edit Flashcard' : 'Add Flashcard'}
            </Text>

            <TextInput
              style={[styles.input, themeStyles.input]}
              placeholder="Question"
              placeholderTextColor={darkMode ? '#aaa' : '#666'}
              value={questionInput}
              onChangeText={setQuestionInput}
              multiline
            />
            <TextInput
              style={[styles.input, themeStyles.input]}
              placeholder="Answer"
              placeholderTextColor={darkMode ? '#aaa' : '#666'}
              value={answerInput}
              onChangeText={setAnswerInput}
              multiline
            />
            <TextInput
              style={[styles.input, themeStyles.input]}
              placeholder="Tags (comma separated)"
              placeholderTextColor={darkMode ? '#aaa' : '#666'}
              value={tagsInput}
              onChangeText={setTagsInput}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={saveCard}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const baseStyles = {
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  switchLabel: {
    marginRight: 8,
    fontSize: 16,
  },
  tagFilterContainer: {
    height: 40,
    marginBottom: 12,
  },
  tagButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagButtonText: {
    fontSize: 14,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    perspective: 1000, // for 3D flip effect
  },
  card: {
    width: '90%',
    minHeight: 180,
    borderRadius: 12,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backfaceVisibility: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardText: {
    fontSize: 24,
    textAlign: 'center',
  },
  noCardsText: {
    fontSize: 18,
    fontStyle: 'italic',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navButton: {
    backgroundColor: '#007bff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  navButtonText: {
    color: 'white',
    fontSize: 16,
  },
  showAnswerButton: {
    backgroundColor: '#28a745',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  showAnswerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  editDeleteRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  editDeleteButton: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
    borderWidth: 1,
  },
  addButton: {
    backgroundColor: '#17a2b8',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 16,
    marginBottom: 12,
    minHeight: 40,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    marginRight: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#28a745',
    marginLeft: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
  },
};

const lightStyles = StyleSheet.create({
  ...baseStyles,
  container: {
    ...baseStyles.container,
    backgroundColor: '#f8f9fa',
  },
  text: {
    color: '#212529',
  },
  card: {
    ...baseStyles.card,
    backgroundColor: 'white',
  },
  tagButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  tagButtonTextSelected: {
    color: 'white',
  },
  editDeleteButton: {
    borderColor: '#007bff',
    backgroundColor: '#e7f1ff',
  },
  modalContent: {
    ...baseStyles.modalContent,
    backgroundColor: 'white',
  },
  input: {
    ...baseStyles.input,
    borderColor: '#ced4da',
    color: '#212529',
  },
});

const darkStyles = StyleSheet.create({
  ...baseStyles,
  container: {
    ...baseStyles.container,
    backgroundColor: '#121212',
  },
  text: {
    color: '#e0e0e0',
  },
  card: {
    ...baseStyles.card,
    backgroundColor: '#1e1e1e',
  },
  tagButtonSelected: {
    backgroundColor: '#0d6efd',
    borderColor: '#0d6efd',
  },
  tagButtonTextSelected: {
    color: 'white',
  },
  editDeleteButton: {
    borderColor: '#0d6efd',
    backgroundColor: '#2a2a72',
  },
  modalContent: {
    ...baseStyles.modalContent,
    backgroundColor: '#1e1e1e',
  },
  input: {
    ...baseStyles.input,
    borderColor: '#444',
    color: '#e0e0e0',
  },
});

