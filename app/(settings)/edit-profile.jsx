import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { getCurrentUserId } from '../../lib/auth';
import { colors } from '../../lib/theme';
import { toUI, toDb } from '../../lib/enums';

const GENDER_OPTIONS = ['Woman', 'Man', 'Non-binary', 'Transgender', 'Other'];
const LIFESTYLE_OPTIONS = ['Yes', 'Sometimes', 'No', 'Prefer not to say'];

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
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
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
        setBudgetMin(data.budget_min != null ? String(data.budget_min) : '');
        setBudgetMax(data.budget_max != null ? String(data.budget_max) : '');
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

    const minVal = budgetMin.trim() ? parseInt(budgetMin, 10) : null;
    const maxVal = budgetMax.trim() ? parseInt(budgetMax, 10) : null;
    if ((budgetMin.trim() && Number.isNaN(minVal)) || (budgetMax.trim() && Number.isNaN(maxVal))) {
      Alert.alert('Invalid budget', 'Budget must be a number.');
      return;
    }
    if (minVal != null && maxVal != null && minVal > maxVal) {
      Alert.alert('Invalid budget', 'Minimum budget cannot be greater than maximum.');
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
        budget_min: minVal,
        budget_max: maxVal,
        move_in_date: moveInDate || null,
        drink: toDb('lifestyle', drink) || null,
        tobacco: toDb('lifestyle', tobacco) || null,
        weed: toDb('lifestyle', weed) || null,
        prompts: newPrompts
      };
      
      if (isoBirthday) {
        updatePayload.birthday = isoBirthday;
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

                <Text style={s.label}>Budget Min (₹ / month)</Text>
                <TextInput
                  style={s.input}
                  placeholder="15000"
                  placeholderTextColor="#9AA0B2"
                  value={budgetMin}
                  onChangeText={setBudgetMin}
                  keyboardType="numeric"
                />

                <Text style={s.label}>Budget Max (₹ / month)</Text>
                <TextInput
                  style={s.input}
                  placeholder="25000"
                  placeholderTextColor="#9AA0B2"
                  value={budgetMax}
                  onChangeText={setBudgetMax}
                  keyboardType="numeric"
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
                  <TextInput
                    style={s.input}
                    placeholder="e.g. A shower thought I recently had..."
                    placeholderTextColor="#9AA0B2"
                    value={prompt1Q}
                    onChangeText={setPrompt1Q}
                  />
                  
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
                  <TextInput
                    style={s.input}
                    placeholder="e.g. My most controversial opinion is..."
                    placeholderTextColor="#9AA0B2"
                    value={prompt2Q}
                    onChangeText={setPrompt2Q}
                  />
                  
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
  chipTextSelected: { color: '#fff' }
});
