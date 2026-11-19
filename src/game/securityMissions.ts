import type {
  ActiveNpcDialogue,
  EmergencyMission,
  EmergencyMissionKind,
  EmergencySeverity,
  NpcMemory,
  NpcPersonality,
  NpcRole,
  SecurityAchievement,
  StationSimState,
} from './types';

export interface EmergencyTemplateSpec {
  kind: EmergencyMissionKind;
  isCrime: boolean;
  title: string;
  titleBn: string;
  severity: EmergencySeverity;
  maxTimeSec: number;
  defaultNodeId: string;
  locationLabel: string;
  objective: string;
  objectiveBn: string;
  propKind: 'fire' | 'package' | 'luggage' | null;
  rewardMoney: number;
  rewardXp: number;
  rewardRep: number;
  penaltyRep: number;
  witnessClueEn: string;
  witnessClueBn: string;
  victimQuestionBn: string;
  victimQuestionEn: string;
  paNoticeBn: string;
}

export const EMERGENCY_MISSION_TEMPLATES: Record<EmergencyMissionKind, EmergencyTemplateSpec> = {
  lost_child: {
    kind: 'lost_child',
    isCrime: false,
    title: 'Lost Child Rescue',
    titleBn: 'হারানো শিশু উদ্ধার',
    severity: 'high',
    maxTimeSec: 150,
    defaultNodeId: 'waiting_room',
    locationLabel: 'Waiting Room / Platform 1',
    objective: 'Talk to witnesses for clues, find the child near the stalls, & alert Security to reunite.',
    objectiveBn: 'প্রত্যক্ষদর্শীর তথ্য নিন, দোকানের পাশে শিশুকে খুঁজুন ও নিরাপত্তার সহায়তায় পরিবারের কাছে ফিরিয়ে দিন।',
    propKind: null,
    rewardMoney: 95,
    rewardXp: 85,
    rewardRep: 7,
    penaltyRep: 8,
    witnessClueEn: 'A fruit vendor saw a small child in bright clothes admiring snacks near the Platform 1 Fruit Stall!',
    witnessClueBn: 'ফল বিক্রেতা দেখেছেন রঙিন জামা পরা ছোট বাচ্চাটি ১ নম্বর প্ল্যাটফর্মের ফলের দোকানের দিকে হাঁটছিল!',
    victimQuestionBn: 'হায় আল্লাহ! আমার ছোট ছেলেটা ভিড়ে হাত ফসকে হারিয়ে গেছে! ফলের দোকান বা ওয়েটিং রুমে একটু খুঁজবেন?',
    victimQuestionEn: 'Help! My child slipped away in the station crowd! Can you gather clues, locate them & alert security?',
    paNoticeBn: 'জরুরি ঘোষণা! একটি ছোট শিশু পরিবারের থেকে বিচ্ছিন্ন হয়েছে। রেল পুলিশ ও যাত্রীদের সহায়তা কামনা করছি।',
  },
  luggage_theft: {
    kind: 'luggage_theft',
    isCrime: true,
    title: 'Luggage Theft Pursuit',
    titleBn: 'লাগেজ চুরি প্রতিরোধ',
    severity: 'high',
    maxTimeSec: 140,
    defaultNodeId: 'p1_center',
    locationLabel: 'Platform 1 Center',
    objective: 'Question victim/witnesses, dispatch Railway Police to intercept thief, & recover stolen suitcase.',
    objectiveBn: 'যাত্রী ও সাক্ষীর কথা শুনুন, রেল পুলিশ পাঠিয়ে চোরকে ধরুন ও সুটকেস উদ্ধার করুন।',
    propKind: 'luggage',
    rewardMoney: 110,
    rewardXp: 90,
    rewardRep: 8,
    penaltyRep: 8,
    witnessClueEn: 'Witness saw a man in a dark cap sneaking west toward the Ticket Counter carrying a blue suitcase!',
    witnessClueBn: 'সাক্ষী দেখেছেন কালো টুপি পরা একজন লোক নীল সুটকেস নিয়ে টিকিট কাউন্টারের দিকে চুপিচুপি পালাচ্ছে!',
    victimQuestionBn: 'মাস্টার সাহেব! একজন চোর আমার নীল সুটকেস নিয়ে পালাচ্ছে! দ্রুত পুলিশ পাঠান ও খোঁজ নিন!',
    victimQuestionEn: 'Station Master! Someone grabbed my blue suitcase and is slipping into the crowd! Dispatch police!',
    paNoticeBn: 'নিরাপত্তা সতর্কতা! ১ নম্বর প্ল্যাটফর্মে লাগেজ চুরির ঘটনা ঘটেছে—রেল পুলিশ সন্দেহভাজনকে অনুসরণ করছে।',
  },
  medical_emergency: {
    kind: 'medical_emergency',
    isCrime: false,
    title: 'Passenger Medical Emergency',
    titleBn: 'যাত্রীর জরুরি চিকিৎসা',
    severity: 'critical',
    maxTimeSec: 115,
    defaultNodeId: 'p1_bench_c',
    locationLabel: 'Platform 1 Seating',
    objective: 'Provide first-aid / ORS water & dispatch BD Police / Station Staff medical escort.',
    objectiveBn: 'প্রাথমিক চিকিৎসা ও স্যালাইন দিন এবং পুলিশ সহায়তায় মেডিকেল দল পাঠান।',
    propKind: null,
    rewardMoney: 85,
    rewardXp: 80,
    rewardRep: 7,
    penaltyRep: 8,
    witnessClueEn: 'Nearby commuter reports the passenger became dizzy from heat exhaustion near the center canopy.',
    witnessClueBn: 'পাশের যাত্রী জানালেন অতিরিক্ত গরমে মাথা ঘুরে অসুস্থ হয়ে পড়েছেন—দ্রুত ঠান্ডা পানি ও ফার্স্ট-এইড প্রয়োজন।',
    victimQuestionBn: 'উফ... খুব মাথা ঘুরছে, শ্বাস নিতে কষ্ট হচ্ছে... দয়া করে পানি আর ডাক্তারি সাহায্য দিন!',
    victimQuestionEn: 'Ugh... I am dizzy and short of breath from the heat... please get water and medical aid!',
    paNoticeBn: 'মেডিকেল জরুরি অবস্থা! ১ নম্বর প্ল্যাটফর্মে একজন অসুস্থ যাত্রীর জন্য তাৎক্ষণিক সহায়তা পাঠানো হচ্ছে।',
  },
  passenger_fighting: {
    kind: 'passenger_fighting',
    isCrime: true,
    title: 'Passenger Fight / Altercation',
    titleBn: 'প্ল্যাটফর্মে হাতাহাতি ও ঝগড়া',
    severity: 'medium',
    maxTimeSec: 120,
    defaultNodeId: 'ticket_counter',
    locationLabel: 'Ticket Counter Queue',
    objective: 'De-escalate queue fight & dispatch Railway Police to restore calm order.',
    objectiveBn: 'টিকিট কাউন্টারের ঝগড়া থামান এবং পুলিশ পাঠিয়ে শৃঙ্খলা ফিরিয়ে আনুন।',
    propKind: null,
    rewardMoney: 75,
    rewardXp: 65,
    rewardRep: 6,
    penaltyRep: 6,
    witnessClueEn: 'A student in line says someone cut the ticket queue and shoved another commuter.',
    witnessClueBn: 'লাইনের শিক্ষার্থী জানালেন লাইন ভেঙে ঢোকা নিয়ে দুই যাত্রীর মধ্যে তীব্র বাকবিতণ্ডা ও ধাক্কাধাক্কি শুরু হয়েছে।',
    victimQuestionBn: 'স্যার দেখুন! লাইন ভেঙে ধাক্কাধাক্কি করছে আর গালিগালাজ করছে—এখনি পুলিশ ডাকুন!',
    victimQuestionEn: 'Sir, look! He shoved people out of the ticket queue and started a fight—send police now!',
    paNoticeBn: 'সম্মানিত যাত্রীবৃন্দ, টিকিট কাউন্টারের লাইনে শৃঙ্খলা বজায় রাখুন। পুলিশ টহল দল পৌঁছে যাচ্ছে।',
  },
  fire_hazard: {
    kind: 'fire_hazard',
    isCrime: false,
    title: 'Station Fire Hazard',
    titleBn: 'অগ্নিকাণ্ড ও ধোঁয়ার ঝুঁকি',
    severity: 'critical',
    maxTimeSec: 105,
    defaultNodeId: 'tea_stall',
    locationLabel: 'Near Tea Stall (Platform 1)',
    objective: 'Extinguish the flickering blaze [E] near Tea Stall or dispatch Police fire cordon!',
    objectiveBn: 'চা স্টলের পাশের আগুন [E] চেপে নেভান অথবা পুলিশ ও ফায়ার কর্ডন পাঠান!',
    propKind: 'fire',
    rewardMoney: 120,
    rewardXp: 100,
    rewardRep: 9,
    penaltyRep: 10,
    witnessClueEn: 'Stall helper reports an overheated tea stove sparked beside the wooden crates!',
    witnessClueBn: 'দোকানের কর্মী জানালেন স্টোভের তাপে কাঠের বাক্সের পাশে হঠাৎ আগুন ধরে ধোঁয়া উঠছে!',
    victimQuestionBn: 'আগুন! মাস্টার সাহেব, দোকানের পাশে চুলার আগুন ছড়িয়ে পড়ছে—দ্রুত নেভানোর ব্যবস্থা করুন!',
    victimQuestionEn: 'Fire! Station Master, flames are spreading beside the stall—extinguish it or clear the area!',
    paNoticeBn: 'জরুরি অগ্নি-সতর্কতা! যাত্রীদের চায়ের স্টলের পাশ থেকে নিরাপদ দূরত্বে সরে যাওয়ার অনুরোধ করা হচ্ছে।',
  },
  suspicious_package: {
    kind: 'suspicious_package',
    isCrime: true,
    title: 'Suspicious Unattended Package',
    titleBn: 'সন্দেহজনক পরিত্যক্ত ব্যাগ',
    severity: 'critical',
    maxTimeSec: 115,
    defaultNodeId: 'p2_bench_c',
    locationLabel: 'Platform 2 Center Bench',
    objective: 'Keep passengers back, inspect perimeter [E], & dispatch BD Police security unit!',
    objectiveBn: 'যাত্রীদের দূরে সরান, ব্যাগটি নিরাপদ দূরত্ব থেকে পরীক্ষা করুন [E] এবং বাংলাদেশ পুলিশ পাঠান!',
    propKind: 'package',
    rewardMoney: 115,
    rewardXp: 95,
    rewardRep: 8,
    penaltyRep: 9,
    witnessClueEn: 'Witness saw a hooded individual drop a blinking black briefcase under the Platform 2 bench and hurry off.',
    witnessClueBn: 'সাক্ষী দেখেছেন হুডি পরা এক লোক ২ নম্বর প্ল্যাটফর্মের বেঞ্চের নিচে কালো ব্রিফকেস রেখে দ্রুত সরে গেছে।',
    victimQuestionBn: 'স্যার! ২ নম্বর বেঞ্চের পাশে মালিকবিহীন একটা সন্দেহজনক ব্রিফকেস পড়ে আছে—ভেতর থেকে শব্দ হচ্ছে!',
    victimQuestionEn: 'Sir! An unattended briefcase with a blinking light was left by Platform 2 bench!',
    paNoticeBn: 'নিরাপত্তা সতর্কতা! ২ নম্বর প্ল্যাটফর্মে পরিত্যক্ত বস্তু পাওয়া গেছে—নিরাপত্তা দল তল্লাশি চালাচ্ছে।',
  },
  overcrowded_platform: {
    kind: 'overcrowded_platform',
    isCrime: false,
    title: 'Overcrowded Platform Edge',
    titleBn: 'প্ল্যাটফর্মে অতিরিক্ত ভিড়',
    severity: 'high',
    maxTimeSec: 120,
    defaultNodeId: 'p1_me',
    locationLabel: 'Platform 1 Yellow Line',
    objective: 'Broadcast Bangla safety PA & deploy Railway Police to clear the yellow line!',
    objectiveBn: 'বাংলায় সতর্কীকরণ ঘোষণা দিন এবং পুলিশ দিয়ে যাত্রীদের হলুদ লাইনের পেছনে সরান!',
    propKind: null,
    rewardMoney: 80,
    rewardXp: 70,
    rewardRep: 6,
    penaltyRep: 7,
    witnessClueEn: 'Ticket Collector warns passengers are leaning beyond the yellow safety curb ahead of an Express arrival.',
    witnessClueBn: 'টিসি সতর্ক করেছেন এক্সপ্রেস ট্রেন আসার আগে প্রচুর যাত্রী হলুদ লাইনের একদম কিনারে দাঁড়িয়ে পড়েছেন।',
    victimQuestionBn: 'মাস্টার সাহেব! প্রচণ্ড ভিড়ে যাত্রীরা হলুদ লাইনের বাইরে চলে আসছে—যেকোনো সময় দুর্ঘটনা ঘটতে পারে!',
    victimQuestionEn: 'Station Master! Heavy crowd pressure is pushing commuters over the yellow line!',
    paNoticeBn: 'যাত্রীদের দৃষ্টি আকর্ষণ করছি! ট্রেন প্রবেশের সময় দয়া করে হলুদ নিরাপত্তা লাইনের পেছনে অবস্থান করুন।',
  },
  pickpocket_caught: {
    kind: 'pickpocket_caught',
    isCrime: true,
    title: 'Active Pickpocket Incident',
    titleBn: 'পকেটমার শনাক্ত ও আটক',
    severity: 'high',
    maxTimeSec: 125,
    defaultNodeId: 'p1_mw',
    locationLabel: 'Platform 1 West Queue',
    objective: 'Interview victim, identify suspect near queue, & let police intercept the pickpocket!',
    objectiveBn: 'ভুক্তভোগীর বক্তব্য নিন, পকেটমারকে শনাক্ত করুন এবং পুলিশ দিয়ে হাতেনাতে আটক করুন!',
    propKind: null,
    rewardMoney: 95,
    rewardXp: 85,
    rewardRep: 7,
    penaltyRep: 7,
    witnessClueEn: 'A nearby vendor noticed a quick-handed man in a grey shirt bumping commuters near the schedule board.',
    witnessClueBn: 'পাশের বিক্রেতা দেখেছেন ধূসর শার্ট পরা এক চটপটে লোক সময়সূচী বোর্ডের কাছে যাত্রীদের পকেটে হাত দিচ্ছে।',
    victimQuestionBn: 'হায় হায়! আমার পাঞ্জাবির পকেট থেকে মানিব্যাগটা টান দিয়ে কে যেন ভিড়ে মিশে গেল!',
    victimQuestionEn: 'Oh no! Someone slipped my wallet right out of my pocket and blended into the platform crowd!',
    paNoticeBn: 'যাত্রীবৃন্দ সাবধান! স্টেশনে পকেটমার চক্র সক্রিয়—রেল পুলিশ সন্দেহভাজনদের তল্লাশি করছে।',
  },
  restricted_track_trespass: {
    kind: 'restricted_track_trespass',
    isCrime: true,
    title: 'Unauthorized Track Trespass',
    titleBn: 'রেললাইনে অবৈধ প্রবেশ',
    severity: 'critical',
    maxTimeSec: 100,
    defaultNodeId: 'p1_cross',
    locationLabel: 'East Track Apron (x = 18.5)',
    objective: 'Warn trespasser / dispatch Railway Police to escort them safely off railway tracks!',
    objectiveBn: 'রেললাইনে নেমে পড়া ব্যক্তিকে সতর্ক করুন ও রেল পুলিশ পাঠিয়ে নিরাপদ স্থানে সরিয়ে আনুন!',
    propKind: null,
    rewardMoney: 105,
    rewardXp: 90,
    rewardRep: 8,
    penaltyRep: 9,
    witnessClueEn: 'Crossing watchman reports an unauthorized person hopped down near Track 1 East approach!',
    witnessClueBn: 'গেটম্যান জানালেন এক ব্যক্তি নিষেধাজ্ঞা অমান্য করে ১ নম্বর রেললাইনের কিনারে হাঁটছে!',
    victimQuestionBn: 'মাস্টার সাহেব! ওই লোকটা লাল সিগন্যাল উপেক্ষা করে সরাসরি রেললাইনের ওপর দিয়ে হাঁটছে!',
    victimQuestionEn: 'Station Master! That person ignored the red signal and stepped onto the restricted track apron!',
    paNoticeBn: 'কঠোর সতর্কবার্তা! রেললাইন পারাপারের জন্য শুধুমাত্র ফুটওভার ব্রিজ ব্যবহার করুন—পুলিশ ব্যবস্থা নিচ্ছে।',
  },
  elderly_emergency: {
    kind: 'elderly_emergency',
    isCrime: false,
    title: 'Elderly Passenger Assistance',
    titleBn: 'বয়স্ক যাত্রীর জরুরি সহায়তা',
    severity: 'medium',
    maxTimeSec: 135,
    defaultNodeId: 'p2_bench_w',
    locationLabel: 'Platform 2 West Bench',
    objective: 'Assist elderly passenger safely & assign police/staff escort to Waiting Room.',
    objectiveBn: 'বয়স্ক যাত্রীকে নিরাপদে সাহায্য করুন ও পুলিশ/স্টাফ দিয়ে ওয়েটিং রুমে পৌঁছে দিন।',
    propKind: null,
    rewardMoney: 75,
    rewardXp: 65,
    rewardRep: 6,
    penaltyRep: 5,
    witnessClueEn: 'A commuter reports an elderly traveler on Platform 2 feeling weak and needing escort over the bridge.',
    witnessClueBn: 'একজন যাত্রী জানালেন ২ নম্বর প্ল্যাটফর্মে এক প্রবীণ যাত্রী দুর্বল হয়ে পড়েছেন—সাহায্য দরকার।',
    victimQuestionBn: 'বাবা, বুকে একটু চাপ লাগছে আর একা হাঁটতে পারছি না... আমাকে ওয়েটিং রুমে নিয়ে যাবে?',
    victimQuestionEn: 'Son, my legs are trembling and I feel weak... could you arrange safe escort to the waiting room?',
    paNoticeBn: 'স্টেশন কর্মী ও রেল পুলিশ ২ নম্বর প্ল্যাটফর্মে বয়স্ক যাত্রীর সহায়তায় এগিয়ে যাচ্ছেন।',
  },
  mobile_theft: {
    kind: 'mobile_theft',
    isCrime: true,
    title: 'Mobile Phone Snatching',
    titleBn: 'মোবাইল ফোন ছিনতাই',
    severity: 'high',
    maxTimeSec: 130,
    defaultNodeId: 'forecourt_c',
    locationLabel: 'Station Forecourt',
    objective: 'Gather witness description & dispatch BD Police to catch the phone snatcher!',
    objectiveBn: 'প্রত্যক্ষদর্শীর বর্ণনা নিন এবং বাংলাদেশ পুলিশ পাঠিয়ে মোবাইল ছিনতাইকারীকে ধরুন!',
    propKind: null,
    rewardMoney: 100,
    rewardXp: 85,
    rewardRep: 7,
    penaltyRep: 7,
    witnessClueEn: 'Rickshaw puller saw the phone snatcher wearing dark sunglasses ducking past the Newspaper Stall.',
    witnessClueBn: 'রিকশাচালক দেখলেন কালো চশমা পরা ছিনতাইকারী পত্রিকার দোকানের পাশ দিয়ে দৌড়ে যাচ্ছে!',
    victimQuestionBn: 'ভাই! স্টেশনের সামনে ফোনে কথা বলছিলাম, হঠাৎ মোবাইলটা ছিনিয়ে নিয়ে দৌড় দিল!',
    victimQuestionEn: 'Brother! Someone snatched my phone right in front of the station entrance!',
    paNoticeBn: 'নিরাপত্তা সতর্কতা! স্টেশন চত্বরে মোবাইল ছিনতাই হয়েছে—বাংলাদেশ পুলিশ ধাওয়া করছে।',
  },
  ticket_fraud: {
    kind: 'ticket_fraud',
    isCrime: true,
    title: 'Fake Ticket Fraud Ring',
    titleBn: 'জাল টিকিট বিক্রি ও প্রতারণা',
    severity: 'medium',
    maxTimeSec: 135,
    defaultNodeId: 'ticket_counter',
    locationLabel: 'Ticket Counter Plaza',
    objective: 'Investigate fake-ticket complaints & assign police to detain the fraudster.',
    objectiveBn: 'জাল টিকিট চক্রের তথ্য যাচাই করুন এবং পুলিশ দিয়ে প্রতারককে আটক করুন।',
    propKind: null,
    rewardMoney: 90,
    rewardXp: 75,
    rewardRep: 7,
    penaltyRep: 6,
    witnessClueEn: 'Ticket Collector noted a tout in a dark hood selling forged printed tickets beside the waiting room.',
    witnessClueBn: 'টিকিট পরীক্ষক দেখলেন কালো হুডি পরা এক দালাল ওয়েটিং রুমের পাশে ভুয়া টিকিট বিক্রি করছে।',
    victimQuestionBn: 'স্যার, বেশি দাম দিয়ে টিকিট কিনলাম—কাউন্টারে গিয়ে দেখি এটা নাকি নকল প্রিন্ট!',
    victimQuestionEn: 'Sir, I bought a ticket outside and the counter says it is a forged counterfeit!',
    paNoticeBn: 'সতর্কতা! শুধুমাত্র নির্ধারিত কাউন্টার থেকে টিকিট সংগ্রহ করুন—টিকিট দালালদের বিরুদ্ধে অভিযান চলছে।',
  },
  attempted_robbery: {
    kind: 'attempted_robbery',
    isCrime: true,
    title: 'Attempted Robbery Alert',
    titleBn: 'ডাকাতি ও ছিনতাইয়ের চেষ্টা',
    severity: 'critical',
    maxTimeSec: 110,
    defaultNodeId: 'forecourt_e',
    locationLabel: 'East Approach Forecourt',
    objective: 'Report immediately & dispatch Police officers to intercept armed/aggressive robber!',
    objectiveBn: 'অবিলম্বে পুলিশ পাঠান ও যাত্রীকে রক্ষা করে ছিনতাইকারীকে আটক করুন!',
    propKind: null,
    rewardMoney: 130,
    rewardXp: 110,
    rewardRep: 9,
    penaltyRep: 10,
    witnessClueEn: 'Book stall vendor points toward a dark-clad figure cornering a traveler near the East Forecourt!',
    witnessClueBn: 'বইয়ের দোকানদার জানালেন পূর্ব চত্বরে কালো পোশাকের এক লোক এক যাত্রীকে ঘিরে ভয় দেখাচ্ছে!',
    victimQuestionBn: 'বাঁচাও! লোকটা আমার ব্যাগ আর টাকা জোর করে ছিনিয়ে নেওয়ার চেষ্টা করছে!',
    victimQuestionEn: 'Help! This stranger is trying to rob my cash bag by force near the east lane!',
    paNoticeBn: 'জরুরি নিরাপত্তা অ্যালার্ট! স্টেশনের পূর্ব প্রান্তে ছিনতাইয়ের চেষ্টা—নিরাপত্তা বাহিনী দ্রুত পৌঁছাচ্ছে।',
  },
};

export const MISSION_ROTATION_ORDER: readonly EmergencyMissionKind[] = [
  'lost_child',
  'luggage_theft',
  'fire_hazard',
  'pickpocket_caught',
  'suspicious_package',
  'restricted_track_trespass',
  'medical_emergency',
  'passenger_fighting',
  'overcrowded_platform',
  'elderly_emergency',
  'mobile_theft',
  'ticket_fraud',
  'attempted_robbery',
];

export function createDefaultAchievements(): SecurityAchievement[] {
  return [
    {
      id: 'first_responder',
      title: 'First Responder',
      titleBn: 'প্রথম সাড়া প্রদানকারী',
      description: 'Successfully resolve your first station emergency or safety incident.',
      unlocked: false,
      unlockedDay: null,
    },
    {
      id: 'child_rescuer',
      title: 'Guardian Angel',
      titleBn: 'শিশু উদ্ধারকারী',
      description: 'Safely locate and reunite a lost child with their family.',
      unlocked: false,
      unlockedDay: null,
    },
    {
      id: 'theft_stopper',
      title: 'Station Crimebuster',
      titleBn: 'চুরি প্রতিরোধক',
      description: 'Prevent theft or catch a suspect through investigation & police response.',
      unlocked: false,
      unlockedDay: null,
    },
    {
      id: 'eagle_eye_investigator',
      title: 'Sharp Investigator',
      titleBn: 'সতর্ক গোয়েন্দা',
      description: 'Collect witness clues during an active investigation to identify a suspect.',
      unlocked: false,
      unlockedDay: null,
    },
    {
      id: 'hazard_controller',
      title: 'Crisis Commander',
      titleBn: 'সংকট নিয়ন্ত্রক',
      description: 'Handle a fire hazard, suspicious package, or track trespass safely.',
      unlocked: false,
      unlockedDay: null,
    },
    {
      id: 'safe_junction',
      title: 'Model Safe Junction',
      titleBn: 'আদর্শ নিরাপদ জংশন',
      description: 'Achieve 92%+ Security Rating with at least 4 resolved emergencies.',
      unlocked: false,
      unlockedDay: null,
    },
  ];
}

export function unlockAchievement(
  achievements: readonly SecurityAchievement[],
  achievementId: string,
  dayNumber: number,
): { next: SecurityAchievement[]; newlyUnlocked: SecurityAchievement | null } {
  let newlyUnlocked: SecurityAchievement | null = null;
  const next = achievements.map((a) => {
    if (a.id === achievementId && !a.unlocked) {
      newlyUnlocked = { ...a, unlocked: true, unlockedDay: dayNumber };
      return newlyUnlocked;
    }
    return a;
  });
  return { next, newlyUnlocked };
}

export function buildMissionWitnessDialogue(
  npc: {
    id: string;
    name: string;
    nameBn: string;
    role: NpcRole;
    personality: NpcPersonality;
  },
  mission: EmergencyMission,
): ActiveNpcDialogue {
  const spec = EMERGENCY_MISSION_TEMPLATES[mission.kind];
  const alreadyClued = mission.cluesCollected.includes(spec.witnessClueEn);

  return {
    npcId: npc.id,
    npcName: npc.name,
    npcNameBn: npc.nameBn,
    role: npc.role,
    roleLabel: `Witness · ${mission.title}`,
    personality: npc.personality,
    memorySummary: `Active Mission: ${mission.titleBn}`,
    incidentKind: null,
    missionId: mission.id,
    missionKind: mission.kind,
    questionBn: `মাস্টার সাহেব! ${mission.titleBn} ঘটনায় আমি গুরুত্বপূর্ণ কিছু দেখেছি—জানতে চান?`,
    questionEn: `Station Master! I witnessed something important regarding "${mission.title}" at ${mission.locationLabel}.`,
    choices: [
      {
        id: 'record_clue_and_dispatch',
        label: alreadyClued
          ? 'Thank witness & dispatch nearest Police Officer immediately'
          : `Record witness clue & alert Station Security (${mission.locationLabel})`,
        labelBn: alreadyClued
          ? 'তথ্যের জন্য ধন্যবাদ দিয়ে নিকটস্থ পুলিশকে দ্রুত ঘটনাস্থলে পাঠান'
          : 'প্রত্যক্ষদর্শীর তথ্য লিপিবদ্ধ করে পুলিশ নিরাপত্তা দলকে সংকেত দিন',
        isCorrect: true,
        replyBn: spec.witnessClueBn,
        replyEn: spec.witnessClueEn,
        satisfactionDelta: 4,
        repDelta: 2,
        xpDelta: 25,
        moneyDelta: 15,
        complaintDelta: 0,
        missionAction: 'gather_clue',
        missionId: mission.id,
      },
      {
        id: 'ignore_witness',
        label: 'Dismiss witness statement as station rumor',
        labelBn: 'গুজব বলে সাক্ষীর কথা উড়িয়ে দিন',
        isCorrect: false,
        replyBn: 'সত্যি কথা বললাম আর আপনি বিশ্বাসই করলেন না!',
        replyEn: 'I gave you an eyewitness lead and you brushed it off!',
        satisfactionDelta: -5,
        repDelta: -3,
        xpDelta: 0,
        moneyDelta: 0,
        complaintDelta: 1,
      },
    ],
  };
}

export function buildMissionVictimDialogue(
  npc: {
    id: string;
    name: string;
    nameBn: string;
    role: NpcRole;
    personality: NpcPersonality;
    memory: NpcMemory;
  },
  mission: EmergencyMission,
): ActiveNpcDialogue {
  const spec = EMERGENCY_MISSION_TEMPLATES[mission.kind];

  if (mission.kind === 'lost_child') {
    const readyToReunite = mission.status === 'awaiting_reunion';
    return {
      npcId: npc.id,
      npcName: npc.name,
      npcNameBn: npc.nameBn,
      role: npc.role,
      roleLabel: `Guardian · ${mission.title}`,
      personality: npc.personality,
      memorySummary: `Mission Status: ${mission.status.replace('_', ' ')} · Clues: ${mission.cluesCollected.length}`,
      incidentKind: null,
      missionId: mission.id,
      missionKind: mission.kind,
      questionBn: readyToReunite
        ? 'আমার সোনা মানিককে খুঁজে পেয়েছেন?! দয়া করে আমার কাছে এনে দিন!'
        : spec.victimQuestionBn,
      questionEn: readyToReunite
        ? 'Have you brought my child back safely?!'
        : spec.victimQuestionEn,
      choices: [
        readyToReunite
          ? {
              id: 'complete_reunion',
              label: 'Reunite lost child safely with guardian & confirm well-being',
              labelBn: 'শিশুটিকে নিরাপদে অভিভাবকের হাতে তুলে দিন',
              isCorrect: true,
              replyBn: 'আলহামদুলিল্লাহ! আমার বাচ্চা ফিরে এসেছে! মাস্টার সাহেব, আপনি দেবদূত!',
              replyEn: 'Thank goodness! My child is safe in my arms! You are a true hero!',
              satisfactionDelta: 12,
              repDelta: mission.rewardRep,
              xpDelta: mission.rewardXp,
              moneyDelta: mission.rewardMoney,
              complaintDelta: 0,
              missionAction: 'reunite_child',
              missionId: mission.id,
            }
          : {
              id: 'dispatch_police_child_search',
              label: 'Broadcast Bengali PA alert & dispatch Railway Police to search stalls',
              labelBn: 'বাংলায় মাইকে ঘোষণা দিয়ে রেল পুলিশকে দোকান ও ওয়েটিং রুম খুঁজতে পাঠান',
              isCorrect: true,
              replyBn: 'দ্রুত খুঁজে দিন স্যার! ফলের দোকান আর ওয়েটিং রুমের দিকেই ও তাকিয়ে ছিল!',
              replyEn: 'Please hurry! They were looking toward the Fruit Stall and Waiting Room!',
              satisfactionDelta: 5,
              repDelta: 2,
              xpDelta: 25,
              moneyDelta: 15,
              complaintDelta: 0,
              missionAction: 'dispatch_police',
              missionId: mission.id,
            },
        {
          id: 'calm_guardian_clues',
          label: 'Reassure guardian, take child clothing description, & search platforms personally',
          labelBn: 'অভিভাবককে শান্ত করে পোশাকের বর্ণনা নিয়ে নিজেই প্ল্যাটফর্মে খুঁজতে বের হন',
          isCorrect: true,
          replyBn: 'লাল-নীল জামা পরে আছে স্যার! দয়া করে ওকে নিয়ে আসুন!',
          replyEn: 'Wearing bright clothes, Sir! Please bring them right back!',
          satisfactionDelta: 4,
          repDelta: 1,
          xpDelta: 20,
          moneyDelta: 10,
          complaintDelta: 0,
          missionAction: 'gather_clue',
          missionId: mission.id,
        },
      ],
    };
  }

  return {
    npcId: npc.id,
    npcName: npc.name,
    npcNameBn: npc.nameBn,
    role: npc.role,
    roleLabel: `Emergency · ${mission.title}`,
    personality: npc.personality,
    memorySummary: `${mission.locationLabel} · Severity: ${mission.severity.toUpperCase()}`,
    incidentKind: null,
    missionId: mission.id,
    missionKind: mission.kind,
    questionBn: spec.victimQuestionBn,
    questionEn: spec.victimQuestionEn,
    choices: [
      {
        id: 'dispatch_officer_to_scene',
        label: mission.isCrime
          ? 'Dispatch Railway/BD Police to investigate & pursue suspect'
          : 'Dispatch Station Police & Emergency Response immediately',
        labelBn: mission.isCrime
          ? 'দ্রুত পুলিশ পাঠান—ঘটনাস্থল তদন্ত ও অপরাধীকে আটক করুন'
          : 'তাৎক্ষণিক নিরাপত্তা ও জরুরি উদ্ধার দল পাঠান',
        isCorrect: true,
        replyBn: 'ধন্যবাদ মাস্টার সাহেব! পুলিশ দল এগিয়ে আসছে দেখে স্বস্তি পেলাম।',
        replyEn: 'Thank you Station Master! Police officers are on their way!',
        satisfactionDelta: 6,
        repDelta: 3,
        xpDelta: 30,
        moneyDelta: 20,
        complaintDelta: 0,
        missionAction: 'dispatch_police',
        missionId: mission.id,
      },
      mission.isCrime
        ? {
            id: 'gather_suspect_clue',
            label: 'Take victim statement & suspect description clue (+Security Investigation)',
            labelBn: 'ভুক্তভোগীর কাছ থেকে সন্দেহভাজনের বিবরণ ও সূত্র সংগ্রহ করুন',
            isCorrect: true,
            replyBn: spec.witnessClueBn,
            replyEn: spec.witnessClueEn,
            satisfactionDelta: 5,
            repDelta: 2,
            xpDelta: 25,
            moneyDelta: 15,
            complaintDelta: 0,
            missionAction: 'gather_clue',
            missionId: mission.id,
          }
        : {
            id: 'stabilize_directly',
            label: `Assist directly on scene & secure ${mission.locationLabel}`,
            labelBn: 'নিজেই ঘটনাস্থলে গিয়ে পরিস্থিতি নিয়ন্ত্রণ ও নিরাপত্তা নিশ্চিত করুন',
            isCorrect: true,
            replyBn: 'আপনার তাৎক্ষণিক পদক্ষেপে বড় বিপদ থেকে রক্ষা পাওয়া গেল! অশেষ ধন্যবাদ!',
            replyEn: 'Your immediate action stabilized the emergency safely! Thank you!',
            satisfactionDelta: 10,
            repDelta: mission.rewardRep,
            xpDelta: mission.rewardXp,
            moneyDelta: mission.rewardMoney,
            complaintDelta: 0,
            missionAction: 'stabilize_emergency',
            missionId: mission.id,
          },
      {
        id: 'ignore_emergency_alert',
        label: 'Ignore emergency report as low priority',
        labelBn: 'এখন ব্যস্ত আছি বলে এড়িয়ে যান',
        isCorrect: false,
        replyBn: 'এমন জরুরি বিপদেও স্টেশন মাস্টার কোনো ব্যবস্থা নিলেন না?!',
        replyEn: 'An emergency happens and the Station Master refuses to act?!',
        satisfactionDelta: -12,
        repDelta: -6,
        xpDelta: 0,
        moneyDelta: 0,
        complaintDelta: 1,
      },
    ],
  };
}

export function buildSuspectConfrontDialogue(
  npc: {
    id: string;
    name: string;
    nameBn: string;
    role: NpcRole;
    personality: NpcPersonality;
  },
  mission: EmergencyMission,
): ActiveNpcDialogue {
  return {
    npcId: npc.id,
    npcName: npc.name,
    npcNameBn: npc.nameBn,
    role: npc.role,
    roleLabel: `Suspect · ${mission.title}`,
    personality: npc.personality,
    memorySummary: `Suspected in: ${mission.titleBn} · Clues: ${mission.cluesCollected.length}`,
    incidentKind: null,
    missionId: mission.id,
    missionKind: mission.kind,
    questionBn: 'এই যে... আমি তো শুধু ট্রেনের অপেক্ষা করছি, আমার দিকে এভাবে তাকিয়ে আছেন কেন?!',
    questionEn: 'Hey... I am just waiting for a train—why are you questioning me like that?!',
    choices: [
      {
        id: 'confront_and_detain',
        label: 'Confront with investigation evidence & call Railway Police to detain suspect',
        labelBn: 'প্রমাণসহ চ্যালেঞ্জ করুন এবং রেল পুলিশ ডেকে সন্দেহভাজনকে আটক করুন',
        isCorrect: true,
        replyBn: 'ধরা পড়ে গেছি! দয়া করে ছেড়ে দিন, চুরি করা জিনিস ফেরত দিচ্ছি!',
        replyEn: 'Caught! Officers are locking the perimeter—returning the stolen item!',
        satisfactionDelta: 11,
        repDelta: mission.rewardRep,
        xpDelta: mission.rewardXp,
        moneyDelta: mission.rewardMoney,
        complaintDelta: 0,
        missionAction: 'confront_suspect',
        missionId: mission.id,
      },
      {
        id: 'dispatch_shadow_tail',
        label: 'Keep quiet & discreetly radio Police to intercept suspect at platform gate',
        labelBn: 'সতর্ক না করে গোপনে পুলিশকে ওয়াকিটকিতে অবস্থান জানিয়ে ঘেরাও করুন',
        isCorrect: true,
        replyBn: 'কী! চারদিকে পুলিশ ঘিরে ফেলেছে?! পালাব কীভাবে!',
        replyEn: 'What?! Railway Police surrounded the walkway!',
        satisfactionDelta: 7,
        repDelta: 3,
        xpDelta: 35,
        moneyDelta: 25,
        complaintDelta: 0,
        missionAction: 'dispatch_police',
        missionId: mission.id,
      },
      {
        id: 'let_suspect_go',
        label: 'Apologize and let them slip out of the station unchecked',
        labelBn: 'ভুল হয়েছে বলে ছেড়ে দিন',
        isCorrect: false,
        replyBn: 'হা হা! স্টেশন মাস্টার কিছুই ধরতে পারল না!',
        replyEn: 'Haha, slipped right past the Station Master!',
        satisfactionDelta: -10,
        repDelta: -5,
        xpDelta: 0,
        moneyDelta: 0,
        complaintDelta: 1,
      },
    ],
  };
}

export function buildLostChildDialogue(
  childNpc: {
    id: string;
    name: string;
    nameBn: string;
    role: NpcRole;
    personality: NpcPersonality;
  },
  mission: EmergencyMission,
): ActiveNpcDialogue {
  return {
    npcId: childNpc.id,
    npcName: childNpc.name,
    npcNameBn: childNpc.nameBn,
    role: childNpc.role,
    roleLabel: 'Lost Child · Missing Child Rescue',
    personality: childNpc.personality,
    memorySummary: 'Safely found off-tracks · Needs guardian reunion',
    incidentKind: null,
    missionId: mission.id,
    missionKind: mission.kind,
    questionBn: 'আঙ্কেল... ভিড়ের মধ্যে আম্মু-আব্বুকে হারিয়ে ফেলেছি! ভয় লাগছে, বাড়ি যাব!',
    questionEn: 'Uncle... I got lost in the crowd and cannot find my parents! Please take me back!',
    choices: [
      {
        id: 'escort_child_to_guardian',
        label: 'Reassure child & alert Security to escort straight to Waiting Room guardian',
        labelBn: 'সান্ত্বনা দিয়ে নিরাপত্তা দলের সহায়তায় অভিভাবকের কাছে পৌঁছে দিন',
        isCorrect: true,
        replyBn: 'জি আঙ্কেল! ওই যে ওয়েটিং রুমের সামনে আম্মুকে দেখতে পাচ্ছি! চলুন!',
        replyEn: 'Yes Uncle! Let us walk right back to the Waiting Room!',
        satisfactionDelta: 10,
        repDelta: 5,
        xpDelta: 45,
        moneyDelta: 35,
        complaintDelta: 0,
        missionAction: 'locate_child',
        missionId: mission.id,
      },
    ],
  };
}

export function buildPoliceOfficerDialogue(
  officer: {
    id: string;
    name: string;
    nameBn: string;
    role: NpcRole;
    personality: NpcPersonality;
    memory: NpcMemory;
  },
  activeMissions: readonly EmergencyMission[],
): ActiveNpcDialogue {
  const urgentMission = activeMissions[0] ?? null;

  return {
    npcId: officer.id,
    npcName: officer.name,
    npcNameBn: officer.nameBn,
    role: officer.role,
    roleLabel: officer.role === 'railway_police' ? 'Railway Police (GRP)' : 'Bangladesh Police',
    personality: officer.personality,
    memorySummary: officer.memory.workZone ?? 'Station Security Patrol',
    incidentKind: null,
    missionId: urgentMission?.id ?? null,
    missionKind: urgentMission?.kind ?? null,
    questionBn: urgentMission
      ? `স্যার, স্যালুট! "${urgentMission.titleBn}" (${urgentMission.locationLabel}) নিয়ে আপনার নির্দেশের অপেক্ষায় আছি।`
      : 'স্যার, স্টেশন প্ল্যাটফর্ম ও চত্বরে টহল স্বাভাবিক আছে। কোনো নিরাপত্তা নির্দেশ আছে কি?',
    questionEn: urgentMission
      ? `Sir, saluting! Ready to respond to "${urgentMission.title}" at ${urgentMission.locationLabel}.`
      : 'Sir, station patrol is active across platforms and forecourt. Any security orders?',
    choices: [
      urgentMission
        ? {
            id: 'order_officer_respond',
            label: `Deploy Officer immediately to "${urgentMission.title}" (${urgentMission.locationLabel})`,
            labelBn: `অবিলম্বে "${urgentMission.titleBn}" ঘটনাস্থলে দায়িত্ব পালন করতে বলুন`,
            isCorrect: true,
            replyBn: 'ইয়েস স্যার! এখনি ঘটনাস্থলে গিয়ে এলাকা ঘিরে ও তদন্ত শুরু করছি!',
            replyEn: 'Yes Sir! Heading straight there on foot to investigate & secure!',
            satisfactionDelta: 5,
            repDelta: 2,
            xpDelta: 25,
            moneyDelta: 10,
            complaintDelta: 0,
            missionAction: 'dispatch_police',
            missionId: urgentMission.id,
          }
        : {
            id: 'order_patrol_sweep',
            label: 'Order thorough security patrol sweep of Platform 1, 2 & Yellow Line',
            labelBn: '১ ও ২ নম্বর প্ল্যাটফর্ম এবং হলুদ লাইনে নিরাপত্তা টহল জোরদার করুন',
            isCorrect: true,
            replyBn: 'জি স্যার! পুরো স্টেশনে সতর্ক টহল দিচ্ছি এখন।',
            replyEn: 'Understood Sir! Conducting active patrol sweep across all platforms.',
            satisfactionDelta: 4,
            repDelta: 2,
            xpDelta: 20,
            moneyDelta: 15,
            complaintDelta: 0,
            missionAction: 'secure_area',
          },
      {
        id: 'order_pa_warning',
        label: 'Coordinate Bengali security warning broadcast across PA speakers',
        labelBn: 'মাইকে বাংলায় নিরাপত্তা সতর্কীকরণ ঘোষণা প্রচার করুন',
        isCorrect: true,
        replyBn: 'দারুণ উদ্যোগ স্যার, যাত্রীরা সতর্ক থাকবেন।',
        replyEn: 'Good call Sir, passengers will stay alert.',
        satisfactionDelta: 3,
        repDelta: 1,
        xpDelta: 15,
        moneyDelta: 0,
        complaintDelta: 0,
        missionAction: 'broadcast_pa',
        missionId: urgentMission?.id,
      },
    ],
  };
}

export function buildEmergencyBanglaPa(mission: EmergencyMission): string {
  return EMERGENCY_MISSION_TEMPLATES[mission.kind].paNoticeBn;
}

export function evaluateSecurityAchievements(
  simState: StationSimState,
  resolvedKind?: EmergencyMissionKind,
  wasCrime?: boolean,
  gatheredClue?: boolean,
): { simState: StationSimState; unlockedAchievement: SecurityAchievement | null } {
  let achievements = simState.achievements;
  let firstNew: SecurityAchievement | null = null;

  const tryUnlock = (id: string) => {
    const res = unlockAchievement(achievements, id, simState.dayNumber);
    achievements = res.next;
    if (res.newlyUnlocked && !firstNew) {
      firstNew = res.newlyUnlocked;
    }
  };

  if (simState.emergenciesResolved + simState.crimesPrevented >= 1) {
    tryUnlock('first_responder');
  }
  if (resolvedKind === 'lost_child') {
    tryUnlock('child_rescuer');
  }
  if (wasCrime || simState.crimesPrevented >= 1) {
    tryUnlock('theft_stopper');
  }
  if (gatheredClue) {
    tryUnlock('eagle_eye_investigator');
  }
  if (
    resolvedKind === 'fire_hazard' ||
    resolvedKind === 'suspicious_package' ||
    resolvedKind === 'restricted_track_trespass'
  ) {
    tryUnlock('hazard_controller');
  }
  if (
    simState.securityRating >= 92 &&
    simState.emergenciesResolved + simState.crimesPrevented >= 4
  ) {
    tryUnlock('safe_junction');
  }

  return {
    simState: { ...simState, achievements },
    unlockedAchievement: firstNew,
  };
}
