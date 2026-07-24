import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Pressable, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { getCurrentUserId } from '../../lib/auth';
import { useTheme, useThemedStyles } from '../../lib/ThemeContext';
import { toUI, toDb } from '../../lib/enums';
import { getAge } from '../../lib/age';
import { ZONES_BY_CITY } from '../../lib/locations';
import RangeSlider from '../../components/RangeSlider';
import Calendar from '../../components/Calendar';

const { height: SCREEN_H } = Dimensions.get('window');

const pad2 = (n) => String(n).padStart(2, '0');
const toLocalDateStr = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const addYears = (date, years) => new Date(date.getFullYear() + years, date.getMonth(), date.getDate());

const GENDER_OPTIONS = ['Woman', 'Man', 'Non-binary', 'Transgender', 'Other'];
// Mirrors app/(onboarding)/pronouns.jsx — pick up to four.
const PRONOUN_OPTIONS = ['She/her', 'He/him', 'They/them', 'Ze/zir', 'Ze/zan', 'Other'];
const MAX_PRONOUNS = 4;

const PROMPT_CATEGORIES = [
  {
    key: 'about-me',
    label: 'About me',
    questions: [
      "My idea of a perfect Sunday at home",
      "The one thing I can't live without",
      "The last thing I binge-watched and loved",
      "I'm the flatmate who always",
      "Two truths and a lie about my daily routine",
      "The dish I actually know how to cook",
      "People would describe me as",
      "My favourite way to wind down after work",
      "If you looked at my Spotify, you'd see",
      "The thing I'm currently obsessed with",
    ],
  },
  {
    key: 'living-with-me',
    label: 'Living with me',
    questions: [
      "My sleep schedule in three words",
      "My cleanliness standard is",
      "I handle shared chores by",
      "When it comes to guests, I",
      "My work-from-home setup looks like",
      "My ideal noise level at home is",
      "I'm a morning person / night owl because",
      "Pets at home? My take is",
      "When it comes to splitting bills, I",
      "I handle conflict with flatmates by",
      "My bathroom routine takes",
      "Cooking smells in the flat — I",
    ],
  },
  {
    key: 'my-space',
    label: 'My space',
    questions: [
      "My room aesthetic is",
      "The common spaces I use most are",
      "The flat I'm looking for feels like",
      "Deal-breaker for shared spaces",
      "I keep common areas",
      "My ideal flat has",
      "The neighbourhood vibe I'm looking for",
      "One thing about my space I can't compromise on",
      "I'd describe my home energy as",
    ],
  },
];
const LIFESTYLE_OPTIONS = ['Yes', 'Sometimes', 'No', 'Prefer not to say'];
const BUDGET_MIN = 0;
const BUDGET_MAX = 100000;
const BUDGET_STEP = 1000;

const ChipSelector = ({ options, selected, onSelect }) => {
  const s = useThemedStyles(makeStyles);
  return (
  <View style={s.chipContainer}>
    {options.map(opt => {
      const isSelected = typeof selected === 'string' && selected.toLowerCase() === opt.toLowerCase();
      return (
        <TouchableOpacity 
          key={opt} 
          style={[s.chip, isSelected && s.chipSelected]} 
          onPress={() => onSelect(opt)}
          activeOpacity={0.8}
        >
          <Text style={[s.chipText, isSelected && s.chipTextSelected]}>{opt}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
  );
};

const MultiChipSelector = ({ options, selected, onToggle }) => {
  const s = useThemedStyles(makeStyles);
  return (
  <View style={s.chipContainer}>
    {options.map(opt => {
      const isSelected = selected.includes(opt);
      return (
        <TouchableOpacity
          key={opt}
          style={[s.chip, isSelected && s.chipSelected]}
          onPress={() => onToggle(opt)}
          activeOpacity={0.8}
        >
          <Text style={[s.chipText, isSelected && s.chipTextSelected]}>{opt}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
  );
};

const PROMPT_VISIBLE_COUNT = 4;

const PromptPicker = ({ value, onChange }) => {
  const s = useThemedStyles(makeStyles);
  const initialCat = PROMPT_CATEGORIES.find(c => c.questions.includes(value))?.key || PROMPT_CATEGORIES[0].key;
  const [activeCat, setActiveCat] = useState(initialCat);
  const category = PROMPT_CATEGORIES.find(c => c.key === activeCat);

  // Auto-expand if the saved answer's question is further down the list, so
  // picking it never makes it appear to vanish behind "More".
  const selectedBeyondVisible = category.questions.indexOf(value) >= PROMPT_VISIBLE_COUNT;
  const [showAll, setShowAll] = useState(selectedBeyondVisible);

  const handleCategoryChange = (key) => {
    setActiveCat(key);
    setShowAll(false);
  };

  const visibleQuestions = showAll ? category.questions : category.questions.slice(0, PROMPT_VISIBLE_COUNT);
  const hiddenCount = category.questions.length - visibleQuestions.length;

  return (
    <>
      <View style={s.categoryRow}>
        {PROMPT_CATEGORIES.map(c => (
          <TouchableOpacity
            key={c.key}
            style={[s.categoryChip, activeCat === c.key && s.categoryChipActive]}
            onPress={() => handleCategoryChange(c.key)}
            activeOpacity={0.8}
          >
            <Text style={[s.categoryChipText, activeCat === c.key && s.categoryChipTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.chipContainer}>
        {visibleQuestions.map(q => (
          <TouchableOpacity
            key={q}
            style={[s.chip, value === q && s.chipSelected]}
            onPress={() => onChange(q)}
            activeOpacity={0.8}
          >
            <Text style={[s.chipText, value === q && s.chipTextSelected]}>{q}</Text>
          </TouchableOpacity>
        ))}
        {hiddenCount > 0 && (
          <TouchableOpacity style={s.moreChip} onPress={() => setShowAll(true)} activeOpacity={0.8}>
            <Text style={s.moreChipText}>+{hiddenCount} more</Text>
          </TouchableOpacity>
        )}
        {showAll && category.questions.length > PROMPT_VISIBLE_COUNT && (
          <TouchableOpacity style={s.moreChip} onPress={() => setShowAll(false)} activeOpacity={0.8}>
            <Text style={s.moreChipText}>Show less</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
};

const PromptSlotButton = ({ index, question, answer, onPress }) => {
  const s = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const filled = !!(question || answer);
  return (
    <TouchableOpacity style={[s.promptSlot, filled && s.promptSlotFilled]} onPress={onPress} activeOpacity={0.8}>
      <View style={{ flex: 1 }}>
        {filled ? (
          <>
            <Text style={s.promptSlotQ} numberOfLines={2}>{question || 'No question picked'}</Text>
            <Text style={s.promptSlotA} numberOfLines={1}>{answer || 'Add your answer'}</Text>
          </>
        ) : (
          <Text style={s.promptSlotEmpty}>Add prompt {index}</Text>
        )}
      </View>
      <Ionicons
        name={filled ? 'create-outline' : 'add'}
        size={18}
        color={filled ? colors.blue : '#9AA0B2'}
      />
    </TouchableOpacity>
  );
};

/** Editor for a single prompt slot. Drafts locally so Cancel discards edits. */
const PromptEditorModal = ({ visible, index, question, answer, onSave, onClear, onClose }) => {
  const s = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [q, setQ] = useState(question);
  const [a, setA] = useState(answer);

  useEffect(() => {
    if (visible) {
      setQ(question);
      setA(answer);
    }
  }, [visible, question, answer]);

  // Manual backdrop-fade + sheet-slide (decoupled), same as PreferencesSheet —
  // Modal's own animationType="slide" transforms the whole subtree together, so
  // the backdrop rides up with the sheet instead of dimming immediately.
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(sheetY, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      sheetY.setValue(SCREEN_H);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[s.promptBackdrop, { opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View style={[s.promptSheet, { transform: [{ translateY: sheetY }] }]}>
            <View style={s.promptSheetHeader}>
              <Text style={s.promptSheetTitle}>Prompt {index}</Text>
              <TouchableOpacity onPress={onClose} style={s.promptSheetClose} activeOpacity={0.7}>
                <Ionicons name="close" size={16} color={colors.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={s.label}>Question</Text>
              <PromptPicker value={q} onChange={setQ} />

              <Text style={s.label}>Answer</Text>
              <TextInput
                style={[s.input, s.textArea]}
                placeholder="Type your answer here..."
                placeholderTextColor="#9AA0B2"
                value={a}
                onChangeText={setA}
                multiline
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={s.promptSheetActions}>
              {(question || answer) ? (
                <TouchableOpacity style={s.promptClearBtn} onPress={onClear} activeOpacity={0.8}>
                  <Text style={s.promptClearText}>Remove</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={s.promptDoneBtn}
                onPress={() => onSave(q, a)}
                activeOpacity={0.85}
              >
                <Text style={s.promptDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default function EditProfileScreen() {
  const s = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Basic Info
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState(''); // YYYY-MM-DD
  const [gender, setGender] = useState('');
  const [pronouns, setPronouns] = useState([]);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [profileCity, setProfileCity] = useState(''); // read-only, just scopes the location chip options

  // Work & Education
  const [jobTitle, setJobTitle] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [educationSchool, setEducationSchool] = useState('');
  const [educationLevel, setEducationLevel] = useState('');

  // Housing
  const [budgetMin, setBudgetMin] = useState(BUDGET_MIN);
  const [budgetMax, setBudgetMax] = useState(20000);
  const [moveInDate, setMoveInDate] = useState(''); // YYYY-MM-DD

  // Lifestyle
  const [drink, setDrink] = useState('');
  const [tobacco, setTobacco] = useState('');
  const [weed, setWeed] = useState('');
  
  // Prompts
  const [prompt1Q, setPrompt1Q] = useState('');
  const [prompt1A, setPrompt1A] = useState('');
  const [prompt2Q, setPrompt2Q] = useState('');
  const [prompt2A, setPrompt2A] = useState('');
  const [prompt3Q, setPrompt3Q] = useState('');
  const [prompt3A, setPrompt3A] = useState('');
  const [editingPrompt, setEditingPrompt] = useState(null); // 1 | 2 | 3 | null

  const promptSlots = [
    { q: prompt1Q, a: prompt1A, setQ: setPrompt1Q, setA: setPrompt1A },
    { q: prompt2Q, a: prompt2A, setQ: setPrompt2Q, setA: setPrompt2A },
    { q: prompt3Q, a: prompt3A, setQ: setPrompt3Q, setA: setPrompt3A },
  ];
  const editingSlot = editingPrompt ? promptSlots[editingPrompt - 1] : null;

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const uid = getCurrentUserId();
      if (!uid) return;
      
      const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
      if (error) throw error;
      
      if (data) {
        // Alert.alert('Debug Data', `gender: ${data.gender}, drink: ${data.drink}, tobacco: ${data.tobacco}, weed: ${data.weed}`);
        
        setName(data.name || '');
        
        let initialBirthday = '';
        if (typeof data.birthday === 'string') {
          initialBirthday = data.birthday.split('T')[0];
        }
        setBirthday(initialBirthday);
        
        setGender(toUI('gender', data.gender) || data.gender || '');
        
        if (Array.isArray(data.pronouns)) {
          setPronouns(data.pronouns);
        } else if (typeof data.pronouns === 'string' && data.pronouns.trim()) {
          setPronouns(data.pronouns.split(',').map(p => p.trim()).filter(Boolean));
        } else {
          setPronouns([]);
        }

        setBio(data.bio || '');
        setLocation(data.location || '');
        setProfileCity(data.city || '');
        setJobTitle(data.job_title || '');
        setJobCompany(data.job_company || '');
        setEducationSchool(data.education_school || '');
        setEducationLevel(data.education_level || '');
        setBudgetMin(data.budget_min ?? BUDGET_MIN);
        setBudgetMax(data.budget_max ?? 20000);
        setMoveInDate(typeof data.move_in_date === 'string' ? data.move_in_date.split('T')[0] : '');

        setDrink(toUI('lifestyle', data.drink) || data.drink || '');
        setTobacco(toUI('lifestyle', data.tobacco) || data.tobacco || '');
        setWeed(toUI('lifestyle', data.weed) || data.weed || '');
        
        if (Array.isArray(data.prompts)) {
          if (data.prompts[0]) {
            setPrompt1Q(data.prompts[0].q || '');
            setPrompt1A(data.prompts[0].a || '');
          }
          if (data.prompts[1]) {
            setPrompt2Q(data.prompts[1].q || '');
            setPrompt2A(data.prompts[1].a || '');
          }
          if (data.prompts[2]) {
            setPrompt3Q(data.prompts[2].q || '');
            setPrompt3A(data.prompts[2].a || '');
          }
        }
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
      Alert.alert('Error', 'Failed to load your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const togglePronoun = (opt) => {
    setPronouns(prev => {
      if (prev.includes(opt)) return prev.filter(p => p !== opt);
      if (prev.length >= MAX_PRONOUNS) return prev;
      return [...prev, opt];
    });
  };

  const handleSave = async () => {
    if (saving) return;
    if (!name.trim()) {
      Alert.alert('Missing info', 'Name is required.');
      return;
    }
    
    setSaving(true);
    try {
      const uid = getCurrentUserId();
      if (!uid) return;
      
      const newPrompts = [];
      if (prompt1Q.trim() || prompt1A.trim()) {
        newPrompts.push({ q: prompt1Q.trim(), a: prompt1A.trim() });
      }
      if (prompt2Q.trim() || prompt2A.trim()) {
        newPrompts.push({ q: prompt2Q.trim(), a: prompt2A.trim() });
      }
      if (prompt3Q.trim() || prompt3A.trim()) {
        newPrompts.push({ q: prompt3Q.trim(), a: prompt3A.trim() });
      }

      // Try to construct valid ISO string for birthday if provided
      let isoBirthday = null;
      if (birthday) {
        isoBirthday = new Date(birthday).toISOString();
      }
      
      const updatePayload = {
        name: name.trim(),
        gender: toDb('gender', gender) || null,
        pronouns,
        bio: bio.trim() || null,
        location: location.trim() || null,
        job_title: jobTitle.trim() || null,
        job_company: jobCompany.trim() || null,
        education_school: educationSchool.trim() || null,
        education_level: educationLevel.trim() || null,
        budget_min: budgetMin,
        budget_max: budgetMax,
        move_in_date: moveInDate || null,
        drink: toDb('lifestyle', drink) || null,
        tobacco: toDb('lifestyle', tobacco) || null,
        weed: toDb('lifestyle', weed) || null,
        prompts: newPrompts
      };
      
      if (isoBirthday) {
        updatePayload.birthday = isoBirthday;
        updatePayload.age = getAge(birthday);
      }
      
      const { error } = await supabase.from('profiles').update(updatePayload).eq('id', uid);
      if (error) throw error;
      
      (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'));
    } catch (e) {
      console.error('Error saving profile:', e);
      Alert.alert('Error', e?.message ? `Failed to save profile: ${e.message}` : 'Failed to save profile. Please try again.');
      setSaving(false);
    }
  };

  return (
    <View style={s.screen}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}>
          <Ionicons name="chevron-back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={s.title}>Edit Profile</Text>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={colors.headerText} /> : <Text style={s.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={s.content} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.blue} />
            </View>
          ) : (
            <>
              {/* Basic Info Section */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Basic Info</Text>
                
                <Text style={s.label}>Full Name</Text>
                <TextInput
                  style={s.input}
                  placeholder="Your full name"
                  placeholderTextColor="#9AA0B2"
                  value={name}
                  onChangeText={setName}
                />
                
                <Text style={s.label}>Birthday</Text>
                <Calendar
                  value={birthday}
                  onChange={setBirthday}
                  minDate={toLocalDateStr(addYears(new Date(), -100))}
                  maxDate={toLocalDateStr(addYears(new Date(), -18))}
                  placeholder="Select your birthday"
                />
                
                <Text style={s.label}>Pronouns</Text>
                <MultiChipSelector
                  options={PRONOUN_OPTIONS}
                  selected={pronouns}
                  onToggle={togglePronoun}
                />

                <Text style={s.label}>Gender</Text>
                <ChipSelector options={GENDER_OPTIONS} selected={gender} onSelect={setGender} />

                <Text style={s.label}>Bio</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  placeholder="A few lines about you"
                  placeholderTextColor="#9AA0B2"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  textAlignVertical="top"
                />

                <Text style={s.label}>Location</Text>
                {ZONES_BY_CITY[profileCity]?.length > 0 ? (
                  <ChipSelector
                    options={ZONES_BY_CITY[profileCity].map(z => z.name)}
                    selected={location}
                    onSelect={setLocation}
                  />
                ) : (
                  <Text style={s.infoText}>Set your city during onboarding to choose a location.</Text>
                )}
              </View>

              {/* Work & Education Section */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Work & Education</Text>

                <Text style={s.label}>Job Title</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. Product Designer"
                  placeholderTextColor="#9AA0B2"
                  value={jobTitle}
                  onChangeText={setJobTitle}
                />

                <Text style={s.label}>Company</Text>
                <TextInput
                  style={s.input}
                  placeholder="Where you work"
                  placeholderTextColor="#9AA0B2"
                  value={jobCompany}
                  onChangeText={setJobCompany}
                />

                <Text style={s.label}>School / University</Text>
                <TextInput
                  style={s.input}
                  placeholder="Where you studied"
                  placeholderTextColor="#9AA0B2"
                  value={educationSchool}
                  onChangeText={setEducationSchool}
                />

                <Text style={s.label}>Education Level</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. Bachelor's"
                  placeholderTextColor="#9AA0B2"
                  value={educationLevel}
                  onChangeText={setEducationLevel}
                />
              </View>

              {/* Housing Section */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Housing</Text>

                <Text style={s.label}>Budget Range (₹ / month)</Text>
                <RangeSlider
                  min={BUDGET_MIN}
                  max={BUDGET_MAX}
                  step={BUDGET_STEP}
                  valueMin={budgetMin}
                  valueMax={budgetMax}
                  onChange={(lo, hi) => { setBudgetMin(lo); setBudgetMax(hi); }}
                />

                <Text style={s.label}>Move-in Date</Text>
                <Calendar
                  value={moveInDate}
                  onChange={setMoveInDate}
                  minDate={toLocalDateStr(new Date())}
                  placeholder="Select a move-in date"
                />
              </View>

              {/* Lifestyle Section */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Lifestyle</Text>
                
                <Text style={s.label}>Do you drink?</Text>
                <ChipSelector options={LIFESTYLE_OPTIONS} selected={drink} onSelect={setDrink} />
                
                <Text style={s.label}>Do you smoke tobacco?</Text>
                <ChipSelector options={LIFESTYLE_OPTIONS} selected={tobacco} onSelect={setTobacco} />
                
                <Text style={s.label}>Do you smoke weed?</Text>
                <ChipSelector options={LIFESTYLE_OPTIONS} selected={weed} onSelect={setWeed} />
              </View>

              {/* Prompts Section */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Prompts</Text>
                <Text style={s.infoText}>Prompts help your profile stand out. Choose a question and add your unique answer.</Text>
                
                {promptSlots.map((slot, i) => (
                  <PromptSlotButton
                    key={i}
                    index={i + 1}
                    question={slot.q}
                    answer={slot.a}
                    onPress={() => setEditingPrompt(i + 1)}
                  />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <PromptEditorModal
        visible={editingPrompt !== null}
        index={editingPrompt}
        question={editingSlot?.q ?? ''}
        answer={editingSlot?.a ?? ''}
        onSave={(q, a) => {
          editingSlot.setQ(q);
          editingSlot.setA(a);
          setEditingPrompt(null);
        }}
        onClear={() => {
          editingSlot.setQ('');
          editingSlot.setA('');
          setEditingPrompt(null);
        }}
        onClose={() => setEditingPrompt(null)}
      />
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.header },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: colors.headerText },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: colors.headerText },
  
  content: { flex: 1, padding: 20 },
  
  section: { backgroundColor: colors.card, padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, color: colors.ink, marginBottom: 16 },
  
  infoText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.slate, lineHeight: 20, marginBottom: 16 },
  
  promptSlot: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.canvas, borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
  },
  promptSlotFilled: { backgroundColor: colors.card, borderStyle: 'solid', borderColor: colors.border },
  promptSlotEmpty: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.placeholder },
  promptSlotQ: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.slate },
  promptSlotA: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: colors.ink, marginTop: 3 },

  promptBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  promptSheet: {
    backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 28,
  },
  promptSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20 },
  promptSheetTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: colors.ink },
  promptSheetClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  promptSheetActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  promptClearBtn: { borderRadius: 50, paddingVertical: 15, paddingHorizontal: 22, backgroundColor: colors.canvas },
  promptClearText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: '#FF4D6A' },
  promptDoneBtn: { flex: 1, borderRadius: 50, paddingVertical: 15, alignItems: 'center', backgroundColor: colors.ink },
  promptDoneText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: '#fff' },
  
  label: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.slate, marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: colors.canvas,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 15,
    color: colors.ink,
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 50, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.slate },
  chipTextSelected: { color: '#fff' },

  categoryRow: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 10 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 50, backgroundColor: colors.canvas },
  categoryChipActive: { backgroundColor: colors.ink },
  categoryChipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: colors.slate },
  categoryChipTextActive: { color: '#fff' },

  moreChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 50, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: 'transparent' },
  moreChipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.blue },
});
