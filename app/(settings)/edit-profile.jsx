import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { getCurrentUserId } from '../../lib/auth';
import { colors } from '../../lib/theme';
import { toUI, toDb } from '../../lib/enums';
import { getAge } from '../../lib/age';
import RangeSlider from '../../components/RangeSlider';

const GENDER_OPTIONS = ['Woman', 'Man', 'Non-binary', 'Transgender', 'Other'];

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

const ChipSelector = ({ options, selected, onSelect }) => (
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

const PROMPT_VISIBLE_COUNT = 4;

const PromptPicker = ({ value, onChange }) => {
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

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Basic Info
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState(''); // YYYY-MM-DD
  const [gender, setGender] = useState('');
  const [pronouns, setPronouns] = useState(''); // stored as string in UI, array in DB
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');

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
        
        let initialPronouns = '';
        if (Array.isArray(data.pronouns)) {
          initialPronouns = data.pronouns.join(', ');
        } else if (typeof data.pronouns === 'string') {
          initialPronouns = data.pronouns;
        }
        setPronouns(initialPronouns);

        setBio(data.bio || '');
        setLocation(data.location || '');
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

  const handleSave = async () => {
    if (saving) return;
    if (!name.trim()) {
      Alert.alert('Missing info', 'Name is required.');
      return;
    }
    
    // Simple validation for YYYY-MM-DD
    if (birthday && !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      Alert.alert('Invalid date format', 'Please use YYYY-MM-DD for your birthday.');
      return;
    }

    if (moveInDate && !/^\d{4}-\d{2}-\d{2}$/.test(moveInDate)) {
      Alert.alert('Invalid date format', 'Please use YYYY-MM-DD for your move-in date.');
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
        pronouns: pronouns.trim() ? pronouns.split(',').map(s => s.trim()) : [],
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
      console.log(e);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
      setSaving(false);
    }
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={s.title}>Edit Profile</Text>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={colors.blue} /> : <Text style={s.saveBtnText}>Save</Text>}
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
                
                <Text style={s.label}>Birthday (YYYY-MM-DD)</Text>
                <TextInput
                  style={s.input}
                  placeholder="1995-08-25"
                  placeholderTextColor="#9AA0B2"
                  value={birthday}
                  onChangeText={setBirthday}
                  keyboardType="numeric"
                />
                
                <Text style={s.label}>Pronouns</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. she/her, they/them"
                  placeholderTextColor="#9AA0B2"
                  value={pronouns}
                  onChangeText={setPronouns}
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
                <TextInput
                  style={s.input}
                  placeholder="e.g. Indiranagar, Bengaluru"
                  placeholderTextColor="#9AA0B2"
                  value={location}
                  onChangeText={setLocation}
                />
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

                <Text style={s.label}>Move-in Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={s.input}
                  placeholder="2026-09-01"
                  placeholderTextColor="#9AA0B2"
                  value={moveInDate}
                  onChangeText={setMoveInDate}
                  keyboardType="numeric"
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
                
                <View style={s.promptBlock}>
                  <Text style={s.label}>Question 1</Text>
                  <PromptPicker value={prompt1Q} onChange={setPrompt1Q} />


                  <Text style={s.label}>Answer 1</Text>
                  <TextInput
                    style={[s.input, s.textArea]}
                    placeholder="Type your answer here..."
                    placeholderTextColor="#9AA0B2"
                    value={prompt1A}
                    onChangeText={setPrompt1A}
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                <View style={s.promptBlock}>
                  <Text style={s.label}>Question 2</Text>
                  <PromptPicker value={prompt2Q} onChange={setPrompt2Q} />


                  <Text style={s.label}>Answer 2</Text>
                  <TextInput
                    style={[s.input, s.textArea]}
                    placeholder="Type your answer here..."
                    placeholderTextColor="#9AA0B2"
                    value={prompt2A}
                    onChangeText={setPrompt2A}
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                <View style={s.promptBlock}>
                  <Text style={s.label}>Question 3</Text>
                  <PromptPicker value={prompt3Q} onChange={setPrompt3Q} />

                  <Text style={s.label}>Answer 3</Text>
                  <TextInput
                    style={[s.input, s.textArea]}
                    placeholder="Type your answer here..."
                    placeholderTextColor="#9AA0B2"
                    value={prompt3A}
                    onChangeText={setPrompt3A}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EDEEF2', backgroundColor: '#fff' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: colors.ink },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: colors.blue },
  
  content: { flex: 1, padding: 20 },
  
  section: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#EDEEF2' },
  sectionTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, color: colors.ink, marginBottom: 16 },
  
  infoText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#5A6072', lineHeight: 20, marginBottom: 16 },
  
  promptBlock: { marginBottom: 16 },
  
  label: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#5A6072', marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: '#F2F3F7',
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
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 50, borderWidth: 1, borderColor: '#D0D4DF', backgroundColor: '#fff' },
  chipSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#5A6072' },
  chipTextSelected: { color: '#fff' },

  categoryRow: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 10 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 50, backgroundColor: '#F2F3F7' },
  categoryChipActive: { backgroundColor: colors.ink },
  categoryChipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: '#5A6072' },
  categoryChipTextActive: { color: '#fff' },

  moreChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 50, borderWidth: 1, borderColor: '#D0D4DF', borderStyle: 'dashed', backgroundColor: 'transparent' },
  moreChipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.blue },
});
