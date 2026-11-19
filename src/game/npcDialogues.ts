import type {
  ActiveNpcDialogue,
  ManagedTrain,
  NpcMemory,
  NpcPersonality,
  NpcRole,
  StationEventKind,
  StationSimState,
  TrainSimulationState,
} from './types';

export interface CollisionDialogueLine {
  bn: string;
  en: string;
}

/**
 * 56 authentic, funny Bengali collision reaction captions (Unicode).
 */
export const COLLISION_DIALOGUES_BN: readonly CollisionDialogueLine[] = [
  { bn: 'ভাই, চোখে কি সমস্যা নাকি?', en: 'Bro, is something wrong with your eyes?' },
  { bn: 'এই যে! দেখে চলতে পারেন না?', en: "Hey! Can't you watch where you walk?" },
  { bn: 'স্টেশন মাস্টার সাহেব, একটু সাবধানে!', en: 'Station Master, a little careful please!' },
  { bn: 'আমার চায়ের কাপটা ভেঙে দিলেন!', en: 'You broke my cup of tea!' },
  { bn: 'ভাই, ট্রেন চালাবেন নাকি মানুষ ধাক্কাবেন?', en: 'Bro, are you running trains or bumping people?' },
  { bn: 'আরে ভাই, আমার লাগেজটা গেল কোথায়?', en: 'Hey bro, where did my luggage fly off to?' },
  { bn: 'স্টেশনটা কি আপনার একার?', en: 'Do you own the whole station by yourself?' },
  { bn: 'এইভাবে চললে তো স্টেশনই বন্ধ হয়ে যাবে!', en: 'At this rate the whole station will shut down!' },
  { bn: 'ওরে বাবা! পায়ের আঙুলটা ভর্তা হয়ে গেল!', en: 'Oh my! My toe just turned into bhorta!' },
  { bn: 'হর্ন না দিয়েই ধাক্কা মারলেন ভাই!', en: 'You bumped me without even blowing a horn!' },
  { bn: 'এক্সপ্রেস ট্রেনের চেয়েও আপনার স্পিড বেশি!', en: 'You are faster than an Intercity Express!' },
  { bn: 'ভাই, আমার সিঙ্গারাটা মাটিতে পড়ে গেল তো!', en: 'Bro, my singara fell on the platform!' },
  { bn: 'লাইনচ্যুত হয়ে গেলেন নাকি মাস্টার সাহেব?', en: 'Did you get derailed, Master Shaheb?' },
  { bn: 'প্ল্যাটফর্মেও কি ট্র্যাফিক জ্যাম লাগাবেন?', en: 'Are you trying to start a traffic jam on the platform?' },
  { bn: 'আরে, লাল সিগন্যাল দেখেও থামলেন না!', en: "Hey, you didn't stop even at a RED signal!" },
  { bn: 'আমার চশমাটা আরেকটু হলেই উড়ে যেত!', en: 'My glasses almost flew across the tracks!' },
  { bn: 'ধাক্কা দিয়েই আবার হাসছেন নাকি?', en: 'You bumped me and now you are smiling?' },
  { bn: 'ভাই, আমি তো ইঞ্জিন না, একটু আস্তে!', en: "Bro, I'm not a locomotive, slow down!" },
  { bn: 'চায়ের কেতলি উল্টে গেলে আজ খবর ছিল!', en: 'If the tea kettle tipped over, trouble today!' },
  { bn: 'টিকিট কাটার আগেই ধাক্কা ফ্রি নাকি?', en: 'Are bumps free before buying a ticket?' },
  { bn: 'আরে ভাই, ব্রেক ফেল করলেন নাকি?', en: 'Hey bro, did your brakes fail?' },
  { bn: 'পাঞ্জাবিটা ভাঁজ নষ্ট করে দিলেন তো!', en: 'You ruined the crisp fold on my panjabi!' },
  { bn: 'এত তাড়া কিসের, ট্রেন তো এখনো আসেইনি!', en: "What's the rush? The train isn't even here yet!" },
  { bn: 'মাথায় হাঁড়ি ছিল না বলে বেঁচে গেছি!', en: 'Lucky I had no clay pot on my head!' },
  { bn: 'ভাই, সাইড ইন্ডিকেটর জ্বালিয়ে হাঁটুন!', en: 'Bro, turn on your side indicator while walking!' },
  { bn: 'আরে! এটা ফুটবল মাঠ না, রেলস্টেশন!', en: 'Hey! This is a railway station, not a football pitch!' },
  { bn: 'একটু জায়গা ছাড়ুন, বাতাসও ঢুকতে পারছে না!', en: 'Leave some room, even air cannot pass!' },
  { bn: 'মাস্টার সাহেব কি সুপারসনিক মোডে আছেন?', en: 'Is the Station Master in supersonic mode?' },
  { bn: 'আমার ঝালমুড়ির ঠোঙাটা বাঁচলো কীভাবে!', en: 'How did my jhalmuri paper cone survive that!' },
  { bn: 'প্ল্যাটফর্ম ১-এ তো দেখছি বুলেট ট্রেন চলছে!', en: 'Looks like a bullet train is running on Platform 1!' },
  { bn: 'এই ধাক্কায় আমার ঘুমটা পুরোপুরি ভেঙে গেল!', en: 'That bump woke me up completely!' },
  { bn: 'দাদা, বয়স হয়েছে, একটু আস্তে ধাক্কা দিন!', en: 'Son, I am old, bump gently please!' },
  { bn: 'ওহ! কোমরটায় যেন কারেন্ট শক লাগল!', en: 'Ouch! Felt like an electric shock in my back!' },
  { bn: 'ভাই, আপনি কি গ্রিন সিগন্যাল পেয়ে দৌড়াচ্ছেন?', en: 'Bro, are you sprinting on a green signal?' },
  { bn: 'জুতার ফিতা খুলে গেল আপনার ধাক্কায়!', en: 'My shoelaces came untied from your bump!' },
  { bn: 'আরে! মানুষ না দেখে মোবাইল দেখছেন নাকি?', en: 'Hey! Looking at your phone instead of people?' },
  { bn: 'আমার পেয়ারাগুলো প্ল্যাটফর্মে গড়াগড়ি খাচ্ছে!', en: 'My guavas are rolling all over the platform!' },
  { bn: 'সাবধান! কুলির মাথার সুটকেস পড়ে যেত!', en: "Watch out! The porter's suitcase nearly fell!" },
  { bn: 'স্টেশন মাস্টার বলে কি ছাড় পাবেন?', en: 'Just because you are Station Master you get a pass?' },
  { bn: 'দুই নম্বর প্ল্যাটফর্মের লোকও এই ধাক্কার শব্দ শুনল!', en: 'People on Platform 2 heard that collision!' },
  { bn: 'ভাই, বাম্পার ছাড়াই বাম্পিং কার চালাচ্ছেন!', en: 'Bro, driving bumper cars without a bumper!' },
  { bn: 'আস্তে ভাই! আমার কোমরের বেল্ট টাইট করতে হবে!', en: 'Easy bro! Need to tighten my belt after that!' },
  { bn: 'এই যে হিরো, একটু ডানে-বামে তাকিয়ে হাঁটুন!', en: 'Hey hero, look left and right when walking!' },
  { bn: 'ট্রেন লেট, কিন্তু আপনার ধাক্কা একদম অন-টাইম!', en: 'The train is late, yet your bump is right on time!' },
  { bn: 'আমার পত্রিকার বান্ডিলটা আরেকটু হলেই ছড়িয়ে যেত!', en: 'My newspaper bundle nearly scattered everywhere!' },
  { bn: 'মামা, জ্যামটা কি সড়ক থেকে এখানেও চলে এলো?', en: 'Uncle, did city traffic jam move onto the platform?' },
  { bn: 'আরে, একটু তো হুইসেল বাজাবেন নাকি!', en: 'Hey, could you blow your whistle first at least!' },
  { bn: 'শাপলাপুর জংশনে নতুন নিয়ম—ধাক্কা ফ্রি!', en: 'New rule at Shaplapur Junction—free bumps!' },
  { bn: 'ভাই, ব্যাক গিয়ার দিয়ে একটু পেছনে যান তো!', en: 'Bro, put it in reverse gear for a second!' },
  { bn: 'হাতে গরম চা থাকলে আজ দুজনেই নাচতাম!', en: 'If I held hot tea, both of us would be dancing!' },
  { bn: 'পুলিশ ডাকার আগেই সরে পড়ুন ভাই!', en: 'Move aside before I call Railway Police!' },
  { bn: 'আরে! এটা কি কমলাপুর নাকি শাপলাপুর?', en: 'Hey! Is this rush Kamalapur or Shaplapur?' },
  { bn: 'সবার সামনে এভাবে ধাক্কা দিলে মান-সম্মান থাকে?', en: 'How do I keep my dignity getting bumped in public?' },
  { bn: 'পায়ে পাড়া দিয়েই আবার মুচকি হাসি!', en: 'Stepping on my foot and smiling cheekily!' },
  { bn: 'হলুদ লাইনের বাইরে থাকলে কী হবে, ভেতরেও ধাক্কা!', en: 'Even inside the yellow safety line I get bumped!' },
  { bn: 'চাপ নেবেন না ভাই, তবে একটু ব্রেক চাপুন!', en: 'No stress bro, just press your brakes a bit!' },
];

export function pickCollisionDialogue(recentIndices: number[]): {
  index: number;
  line: CollisionDialogueLine;
} {
  const candidates: number[] = [];
  for (let i = 0; i < COLLISION_DIALOGUES_BN.length; i++) {
    if (!recentIndices.includes(i)) {
      candidates.push(i);
    }
  }
  const pool = candidates.length > 0 ? candidates : [0];
  const index = pool[Math.floor(Math.random() * pool.length)];
  return { index, line: COLLISION_DIALOGUES_BN[index] };
}

export const VENDOR_CRIES_BN: Record<
  'tea_seller' | 'food_vendor' | 'fruit_seller' | 'newspaper_seller',
  readonly { bn: string; en: string }[]
> = {
  tea_seller: [
    { bn: 'গরম চা! গরম চা! দুধ চা, রঙ চা!', en: 'Hot tea! Hot tea! Milk tea, black tea!' },
    { bn: 'মামা, এক কাপ ধোঁয়া ওঠা চা লাগবে?', en: 'Need a steaming cup of cha?' },
    { bn: 'আদা-লেবুর গরম চা নিয়ে যান!', en: 'Fresh ginger-lemon hot tea!' },
  ],
  food_vendor: [
    { bn: 'মামা, চানাচুর লাগবে? ঝালমুড়ি ও চানাচুর!', en: 'Need chanachur or spicy jhalmuri?' },
    { bn: 'গরম সিঙ্গারা, গরম সমুচা! আসুন ভাই!', en: 'Hot singara, hot samosa! Come over!' },
    { bn: 'ঠান্ডা পানি নিয়ে যান! ঠান্ডা পানি!', en: 'Get cold drinking water!' },
  ],
  fruit_seller: [
    { bn: 'টাটকা কলা, মিষ্টি আম ও পেয়ারা নিয়ে যান!', en: 'Fresh bananas, sweet mango & guava!' },
    { bn: 'ভ্রমণের পথে মিষ্টি ফল লাগবে নাকি?', en: 'Sweet fresh fruit for your train journey?' },
  ],
  newspaper_seller: [
    { bn: 'আজকের তাজা খবর! দৈনিক পত্রিকা ও ম্যাগাজিন!', en: "Today's fresh news! Daily newspapers!" },
    { bn: 'সকালের খবরের কাগজ নিন, মাত্র দশ টাকা!', en: 'Morning newspaper, only ten taka!' },
  ],
};

export const ROLE_LABELS: Record<NpcRole, { en: string; bn: string }> = {
  passenger: { en: 'Passenger', bn: 'যাত্রী' },
  porter: { en: 'Porter (Kuli)', bn: 'কুলি' },
  tea_seller: { en: 'Tea Seller', bn: 'চা বিক্রেতা' },
  food_vendor: { en: 'Snack & Water Vendor', bn: 'খাবার বিক্রেতা' },
  fruit_seller: { en: 'Fruit Seller', bn: 'ফল বিক্রেতা' },
  newspaper_seller: { en: 'Newspaper Seller', bn: 'পত্রিকা বিক্রেতা' },
  beggar: { en: 'Mendicant', bn: 'ভিক্ষুক' },
  railway_employee: { en: 'Railway Staff', bn: 'রেল কর্মচারী' },
  ticket_collector: { en: 'Ticket Collector (TC)', bn: 'টিকিট পরীক্ষক' },
  railway_police: { en: 'Railway Police (GRP)', bn: 'রেল পুলিশ' },
  bd_police: { en: 'Bangladesh Police', bn: 'বাংলাদেশ পুলিশ' },
  child: { en: 'Child', bn: 'শিশু' },
  elderly: { en: 'Elderly Passenger', bn: 'বয়স্ক যাত্রী' },
  student: { en: 'Student', bn: 'শিক্ষার্থী' },
  tourist: { en: 'Tourist', bn: 'পর্যটক' },
  family: { en: 'Family Guardian', bn: 'পরিবার অভিভাবক' },
  suspicious: { en: 'Suspicious Person', bn: 'সন্দেহভাজন' },
  pickpocket: { en: 'Pickpocket', bn: 'পকেটমার' },
};

function toBnDigits(val: number | string): string {
  const map = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(val).replace(/\d/g, (d) => map[Number(d)] ?? d);
}

function personalityPrefix(p: NpcPersonality): string {
  switch (p) {
    case 'impatient':
      return 'তাড়াতাড়ি বলুন তো—';
    case 'angry':
      return 'শুনুন মাস্টার সাহেব!';
    case 'confused':
      return 'মাফ করবেন, একটু বুঝিয়ে বলবেন?';
    case 'elderly':
      return 'বাবা, একটু সাহায্য করবে?';
    case 'tourist':
      return 'Excuse me, ভাই—';
    case 'friendly':
      return 'আসসালামু আলাইকুম মাস্টার সাহেব!';
    default:
      return 'ভাই,';
  }
}

function findNextTrainByDest(trains: readonly ManagedTrain[], dest: string): ManagedTrain | undefined {
  return (
    trains.find((t) => t.destination === dest && t.status !== 'Departed') ??
    trains.find((t) => t.destination === dest)
  );
}

/**
 * Generates an interactive schedule-aware Bengali question dialogue for a passenger or NPC.
 */
export function buildPassengerQuestionDialogue(
  npc: {
    id: string;
    name: string;
    nameBn: string;
    role: NpcRole;
    personality: NpcPersonality;
    memory: NpcMemory;
  },
  simState: StationSimState,
  trainState: TrainSimulationState,
  questionVariant: number,
): ActiveNpcDialogue {
  const trains = trainState.trains;
  const dhakaTrain = findNextTrainByDest(trains, 'Dhaka');
  const ctgTrain = findNextTrainByDest(trains, 'Chattogram');
  const delayedTrain = trains.find((t) => t.delayMinutes > 0 && t.status !== 'Departed') ?? trains[2];
  const khulnaTrain = trains.find((t) => t.origin === 'Khulna' || t.destination === 'Khulna');
  const activePlat1Train = trains.find(
    (t) => t.assignedPlatform === 1 && (t.status === 'At Platform' || t.status === 'Boarding'),
  );

  const memoryParts: string[] = [];
  if (npc.memory.assignedPlatform) {
    memoryParts.push(`Platform ${npc.memory.assignedPlatform}`);
  }
  if (npc.memory.targetTrainNumber) {
    memoryParts.push(`Train #${npc.memory.targetTrainNumber}`);
  }
  if (npc.memory.workZone) {
    memoryParts.push(`Zone: ${npc.memory.workZone}`);
  }
  if (npc.memory.bumpedCount > 0) {
    memoryParts.push(`Bumped ${npc.memory.bumpedCount}x`);
  }
  const memorySummary = memoryParts.length > 0 ? memoryParts.join(' · ') : 'Visiting Shaplapur Junction';

  const variant = Math.abs(questionVariant) % 7;

  if (npc.role === 'elderly' || variant === 6) {
    return {
      npcId: npc.id,
      npcName: npc.name,
      npcNameBn: npc.nameBn,
      role: npc.role,
      roleLabel: ROLE_LABELS[npc.role].en,
      personality: npc.personality,
      memorySummary,
      incidentKind: null,
      questionBn: `${personalityPrefix(npc.personality)} আমার মাকে বসার জায়গা দিতে পারবেন?`,
      questionEn: 'Could you help arrange a seat for my elderly mother?',
      choices: [
        {
          id: 'guide_bench',
          label: 'Guide them to the shaded Platform 1 waiting bench & call a porter',
          labelBn: 'ছায়াযুক্ত বেঞ্চে বসিয়ে দিন এবং কুলি ডেকে সাহায্য করুন',
          isCorrect: true,
          replyBn: 'অনেক দোয়া রইল বাবা! আল্লাহ আপনার মঙ্গল করুন।',
          replyEn: 'Thank you so much! That shaded bench is very comfortable.',
          satisfactionDelta: 7,
          repDelta: 3,
          xpDelta: 30,
          moneyDelta: 25,
          complaintDelta: 0,
        },
        {
          id: 'ignore_elderly',
          label: 'Tell them all benches are full and to stand by the tracks',
          labelBn: 'সব বেঞ্চ ভর্তি, লাইনের পাশে দাঁড়িয়ে থাকতে বলুন',
          isCorrect: false,
          replyBn: 'ছিঃ! একজন বয়স্ক মানুষের সাথে এমন ব্যবহার করলেন?',
          replyEn: 'Unbelievable! Leaving an elderly passenger standing near the tracks!',
          satisfactionDelta: -9,
          repDelta: -4,
          xpDelta: 0,
          moneyDelta: 0,
          complaintDelta: 1,
        },
        {
          id: 'waiting_room',
          label: 'Escort them to the West Waiting Room seats away from the crowd',
          labelBn: 'পশ্চিম পাশের ওয়েটিং রুমে নিরিবিলি বসার ব্যবস্থা করুন',
          isCorrect: true,
          replyBn: 'খুব ভালো ব্যবস্থা করেছেন মাস্টার সাহেব, ধন্যবাদ!',
          replyEn: 'Wonderful arrangement, Station Master, thank you!',
          satisfactionDelta: 6,
          repDelta: 2,
          xpDelta: 25,
          moneyDelta: 20,
          complaintDelta: 0,
        },
      ],
    };
  }

  if (variant === 0) {
    const plat = dhakaTrain?.assignedPlatform;
    const platBn = plat ? toBnDigits(plat) : 'নির্ধারিত';
    const wrongPlat = plat === 1 ? 2 : 1;
    const isAssigned = plat !== null && plat !== undefined;

    return {
      npcId: npc.id,
      npcName: npc.name,
      npcNameBn: npc.nameBn,
      role: npc.role,
      roleLabel: ROLE_LABELS[npc.role].en,
      personality: npc.personality,
      memorySummary,
      incidentKind: null,
      questionBn: `${personalityPrefix(npc.personality)} ভাই, ঢাকাগামী ট্রেন কোন প্ল্যাটফর্মে আসবে?`,
      questionEn: 'Brother, which platform will the Dhaka-bound train arrive at?',
      choices: [
        isAssigned
          ? {
              id: 'correct_dhaka_plat',
              label: `Platform ${plat} (${dhakaTrain?.name ?? 'Dhaka Express'} #${dhakaTrain?.trainNumber ?? ''})`,
              labelBn: `${platBn} নম্বর প্ল্যাটফর্মে আসবে`,
              isCorrect: true,
              replyBn: `দারুণ! ${platBn} নম্বর প্ল্যাটফর্মেই যাচ্ছি এখন।`,
              replyEn: `Great! Heading straight to Platform ${plat} right now.`,
              satisfactionDelta: 6,
              repDelta: 2,
              xpDelta: 25,
              moneyDelta: 20,
              complaintDelta: 0,
            }
          : {
              id: 'pending_dhaka_plat',
              label: `Track assignment pending in Control Room (${dhakaTrain?.name ?? 'Turag Commuter'}) — wait near Info Board`,
              labelBn: 'কন্ট্রোল রুমে প্ল্যাটফর্ম নির্ধারণ হচ্ছে, তথ্য বোর্ডের কাছে অপেক্ষা করুন',
              isCorrect: true,
              replyBn: 'ঠিক আছে, প্ল্যাটফর্ম ঘোষণা শোনা মাত্র চলে যাব!',
              replyEn: 'Understood, I will watch the board for the announcement!',
              satisfactionDelta: 5,
              repDelta: 2,
              xpDelta: 25,
              moneyDelta: 15,
              complaintDelta: 0,
            },
        {
          id: 'wrong_dhaka_plat',
          label: `Platform ${wrongPlat} (Direct them to the opposite platform)`,
          labelBn: `${toBnDigits(wrongPlat)} নম্বর প্ল্যাটফর্মে চলে যান`,
          isCorrect: false,
          replyBn: 'আরে! ওখানে গিয়ে দেখি ভুল তথ্য দিয়েছেন! পুরো সময় নষ্ট!',
          replyEn: 'Hey! Wrong platform! You wasted my time!',
          satisfactionDelta: -8,
          repDelta: -3,
          xpDelta: 0,
          moneyDelta: 0,
          complaintDelta: 1,
        },
        {
          id: 'tell_check_desk',
          label: 'Remind them to check the yellow safety line while waiting on Platform 1',
          labelBn: 'হলুদ লাইনের ভেতরে নিরাপদে অপেক্ষা করতে বলুন',
          isCorrect: true,
          replyBn: 'জি অবশ্যই, নিরাপত্তার নিয়ম মেনে দাঁড়াচ্ছি।',
          replyEn: 'Yes of course, staying safely behind the yellow line.',
          satisfactionDelta: 4,
          repDelta: 2,
          xpDelta: 15,
          moneyDelta: 10,
          complaintDelta: 0,
        },
      ],
    };
  }

  if (variant === 1) {
    const arrived =
      ctgTrain?.status === 'At Platform' ||
      ctgTrain?.status === 'Boarding' ||
      ctgTrain?.status === 'Departing';
    const ctgPlat = ctgTrain?.assignedPlatform ?? 1;
    return {
      npcId: npc.id,
      npcName: npc.name,
      npcNameBn: npc.nameBn,
      role: npc.role,
      roleLabel: ROLE_LABELS[npc.role].en,
      personality: npc.personality,
      memorySummary,
      incidentKind: null,
      questionBn: `${personalityPrefix(npc.personality)} চট্টগ্রামের ট্রেন কি চলে এসেছে?`,
      questionEn: 'Has the Chattogram train arrived yet?',
      choices: [
        {
          id: 'accurate_ctg_status',
          label: arrived
            ? `Yes! ${ctgTrain?.name} is currently ${ctgTrain?.status} at Platform ${ctgPlat}`
            : `Not yet — ${ctgTrain?.name ?? 'Chattogram train'} is ${ctgTrain?.status ?? 'Scheduled'}`,
          labelBn: arrived
            ? `হ্যাঁ! ${toBnDigits(ctgPlat)} নম্বর প্ল্যাটফর্মে ট্রেন দাঁড়ানো আছে`
            : `না, ট্রেনটি এখনো ${ctgTrain?.status === 'Approaching' ? 'পথে আসছে' : 'নির্ধারিত সময়ে আসবে'}`,
          isCorrect: true,
          replyBn: arrived
            ? 'শুনে খুব ভালো লাগল! তাড়াতাড়ি উঠে পড়ি।'
            : 'আচ্ছা ধন্যবাদ, তাহলে চা খেয়ে অপেক্ষা করি।',
          replyEn: arrived ? 'Glad to hear! Boarding now.' : 'Thanks, I will grab a tea while waiting.',
          satisfactionDelta: 6,
          repDelta: 2,
          xpDelta: 25,
          moneyDelta: 20,
          complaintDelta: 0,
        },
        {
          id: 'wrong_ctg_status',
          label: arrived
            ? 'No, the Chattogram train was cancelled today'
            : 'Yes, it already departed an hour ago',
          labelBn: arrived ? 'না, আজ চট্টগ্রামের ট্রেন বাতিল হয়েছে' : 'হ্যাঁ, এক ঘণ্টা আগেই চলে গেছে',
          isCorrect: false,
          replyBn: 'কী যা-তা বলছেন! প্ল্যাটফর্মে দাঁড়িয়ে মিথ্যা তথ্য দিলেন?',
          replyEn: 'What nonsense! Why would you give completely false info?',
          satisfactionDelta: -9,
          repDelta: -4,
          xpDelta: 0,
          moneyDelta: 0,
          complaintDelta: 1,
        },
      ],
    };
  }

  if (variant === 2) {
    const mins = delayedTrain?.delayMinutes ?? 15;
    const minsBn = toBnDigits(mins);
    return {
      npcId: npc.id,
      npcName: npc.name,
      npcNameBn: npc.nameBn,
      role: npc.role,
      roleLabel: ROLE_LABELS[npc.role].en,
      personality: npc.personality,
      memorySummary,
      incidentKind: null,
      questionBn: `${personalityPrefix(npc.personality)} আমার ট্রেন কতক্ষণ দেরি করবে?`,
      questionEn: `How long will my train (${delayedTrain?.name ?? 'Padma Mail'}) be delayed?`,
      choices: [
        {
          id: 'exact_delay',
          label:
            mins > 0
              ? `About ${mins} minutes delayed (${delayedTrain?.name ?? 'Mail Express'}) — we apologize for the wait`
              : 'It is running right on schedule with zero delay',
          labelBn:
            mins > 0
              ? `প্রায় ${minsBn} মিনিট বিলম্ব হচ্ছে, কষ্টের জন্য আন্তরিকভাবে দুঃখিত`
              : 'কোনো দেরি নেই, ঠিক সময়েই আসবে',
          isCorrect: true,
          replyBn: 'সঠিক তথ্য দেওয়ার জন্য ধন্যবাদ মাস্টার সাহেব।',
          replyEn: 'Appreciate the honest update, Station Master.',
          satisfactionDelta: 6,
          repDelta: 2,
          xpDelta: 25,
          moneyDelta: 15,
          complaintDelta: 0,
        },
        {
          id: 'rude_delay',
          label: 'Tell them to stop complaining—it arrives whenever it arrives',
          labelBn: 'অভিযোগ বন্ধ করুন, যখন খুশি তখন আসবে',
          isCorrect: false,
          replyBn: 'এমন অসভ্য আচরণ স্টেশনে মেনে নেওয়া যায় না!',
          replyEn: 'Such rude behavior from station staff is unacceptable!',
          satisfactionDelta: -10,
          repDelta: -4,
          xpDelta: 0,
          moneyDelta: 0,
          complaintDelta: 1,
        },
      ],
    };
  }

  if (variant === 3) {
    return {
      npcId: npc.id,
      npcName: npc.name,
      npcNameBn: npc.nameBn,
      role: npc.role,
      roleLabel: ROLE_LABELS[npc.role].en,
      personality: npc.personality,
      memorySummary,
      incidentKind: null,
      questionBn: `${personalityPrefix(npc.personality)} টিকিট কাউন্টার কোথায়?`,
      questionEn: 'Where is the Ticket Counter located?',
      choices: [
        {
          id: 'right_ticket_dir',
          label: 'Just west of the Station Master Office along Platform 1 (green-roofed booth)',
          labelBn: 'স্টেশন মাস্টার অফিসের পশ্চিম পাশেই ১ নম্বর প্ল্যাটফর্ম সংলগ্ন কাউন্টার',
          isCorrect: true,
          replyBn: 'পেয়ে গেছি! ওই যে লাল-সাদা সাইনবোর্ড দেখা যাচ্ছে। ধন্যবাদ!',
          replyEn: 'Found it! Right past the Station Master Office. Thanks!',
          satisfactionDelta: 5,
          repDelta: 2,
          xpDelta: 20,
          moneyDelta: 15,
          complaintDelta: 0,
        },
        {
          id: 'wrong_ticket_dir',
          label: 'Walk out past the village pond on the far south side',
          labelBn: 'দক্ষিণ দিকের গ্রামের পুকুর পার হয়ে চলে যান',
          isCorrect: false,
          replyBn: 'পুকুরের ওপাশে তো কোনো কাউন্টার নেই! শুধু শুধু হাঁটালেন!',
          replyEn: 'There is no counter past the pond! You sent me the wrong way!',
          satisfactionDelta: -8,
          repDelta: -3,
          xpDelta: 0,
          moneyDelta: 0,
          complaintDelta: 1,
        },
      ],
    };
  }

  if (variant === 4) {
    const plat2Clear = !trainState.track1Occupancy.occupied && !trainState.track2Occupancy.occupied;
    return {
      npcId: npc.id,
      npcName: npc.name,
      npcNameBn: npc.nameBn,
      role: npc.role,
      roleLabel: ROLE_LABELS[npc.role].en,
      personality: npc.personality,
      memorySummary,
      incidentKind: null,
      questionBn: `${personalityPrefix(npc.personality)} ২ নম্বর প্ল্যাটফর্মে যাওয়ার রাস্তা কোন দিকে?`,
      questionEn: 'Which way do I walk to reach Platform 2 safely?',
      choices: [
        {
          id: 'safe_footbridge',
          label: 'Use the West Footover Bridge (near Waiting Room) for safe crossing above trains',
          labelBn: 'ওয়েটিং রুমের পাশের নিরাপদ ফুটওভার ব্রিজ দিয়ে পার হয়ে যান',
          isCorrect: true,
          replyBn: 'দারুণ! ফুটওভার ব্রিজ দিয়েই নিরাপদে যাচ্ছি।',
          replyEn: 'Great! Taking the safe footover bridge right now.',
          satisfactionDelta: 7,
          repDelta: 3,
          xpDelta: 25,
          moneyDelta: 20,
          complaintDelta: 0,
        },
        {
          id: 'east_crossing',
          label: plat2Clear
            ? 'Walk East to the wooden plank pedestrian crossing (tracks currently clear)'
            : 'Use the Footover Bridge rather than the plank crossing while trains are on track',
          labelBn: 'পূর্ব দিকের কাঠের ক্রসিং বা ফুটওভার ব্রিজ ব্যবহার করুন',
          isCorrect: true,
          replyBn: 'অসংখ্য ধন্যবাদ মাস্টার সাহেব!',
          replyEn: 'Thank you very much, Station Master!',
          satisfactionDelta: 5,
          repDelta: 2,
          xpDelta: 20,
          moneyDelta: 15,
          complaintDelta: 0,
        },
        {
          id: 'jump_tracks',
          label: 'Just jump straight down onto the railway ballast right here',
          labelBn: 'এখান থেকেই সরাসরি রেললাইনের ওপর দিয়ে লাফ দিয়ে পার হন',
          isCorrect: false,
          replyBn: 'এ কেমন ভয়ংকর পরামর্শ! ট্রেন চলে এলে কী হবে?!',
          replyEn: 'What dangerous advice! What if an express train comes?!',
          satisfactionDelta: -12,
          repDelta: -5,
          xpDelta: 0,
          moneyDelta: 0,
          complaintDelta: 1,
        },
      ],
    };
  }

  // Variant 5: Khulna check
  const hasKhulnaService = Boolean(khulnaTrain);
  return {
    npcId: npc.id,
    npcName: npc.name,
    npcNameBn: npc.nameBn,
    role: npc.role,
    roleLabel: ROLE_LABELS[npc.role].en,
    personality: npc.personality,
    memorySummary,
    incidentKind: null,
    questionBn: `${personalityPrefix(npc.personality)} এই ট্রেন কি খুলনা যাবে?`,
    questionEn: 'Will this train at Platform 1 go to Khulna?',
    choices: [
      {
        id: 'accurate_khulna',
        label: activePlat1Train
          ? `No — ${activePlat1Train.name} (#${activePlat1Train.trainNumber}) goes to ${activePlat1Train.destination}. ${hasKhulnaService ? `Check #${khulnaTrain?.trainNumber} (${khulnaTrain?.name}) for Khulna service.` : ''}`
          : 'Platform 1 currently has no Khulna train; Bandhan Express (#3112) handles the Khulna–Kolkata route.',
        labelBn: activePlat1Train
          ? `না, ১ নম্বর প্ল্যাটফর্মের ট্রেনটি ${activePlat1Train.destinationBn} যাবে। খুলনা রুটের জন্য বন্ধন এক্সপ্রেস (#৩১১২) দেখুন।`
          : '১ নম্বরে এখন খুলনাগামী ট্রেন নেই; বন্ধন এক্সপ্রেস খুলনা রুটে চলে।',
        isCorrect: true,
        replyBn: 'বাহ, সময়মতো বাঁচালেন! নইলে ভুল ট্রেনে উঠে যেতাম।',
        replyEn: 'Whew, saved me in time! I would have boarded the wrong train.',
        satisfactionDelta: 7,
        repDelta: 3,
        xpDelta: 30,
        moneyDelta: 25,
        complaintDelta: 0,
      },
      {
        id: 'wrong_khulna',
        label: 'Yes, hop right aboard Platform 1—it goes straight to Khulna',
        labelBn: 'হ্যাঁ, তাড়াতাড়ি উঠে পড়ুন, এটিই খুলনা যাবে',
        isCorrect: false,
        replyBn: 'অন্য যাত্রীরা বলল এটা খুলনা যায় না! আপনি আমাকে ভুল ট্রেনে তুলে দিচ্ছিলেন!',
        replyEn: 'Other passengers said this does not go to Khulna! You nearly misled me!',
        satisfactionDelta: -10,
        repDelta: -4,
        xpDelta: 0,
        moneyDelta: 0,
        complaintDelta: 1,
      },
    ],
  };
}

export interface IncidentSpec {
  kind: StationEventKind;
  title: string;
  titleBn: string;
  preferredRole: NpcRole;
  preferredZone: 'platform1' | 'platform2' | 'waiting_room' | 'ticket_counter' | 'forecourt' | 'stall';
  questionBn: string;
  questionEn: string;
  choices: ActiveNpcDialogue['choices'];
}

export const STATION_INCIDENT_SPECS: readonly IncidentSpec[] = [
  {
    kind: 'lost_luggage',
    title: 'Lost Luggage',
    titleBn: 'হারানো লাগেজ',
    preferredRole: 'passenger',
    preferredZone: 'platform1',
    questionBn: 'মাস্টার সাহেব! আমার নীল সুটকেসটা খুঁজে পাচ্ছি না—সুবর্ণ এক্সপ্রেস ছাড়ার সময় হয়ে গেল!',
    questionEn: 'Station Master! My blue suitcase is missing right before boarding!',
    choices: [
      {
        id: 'call_porter_search',
        label: 'Radio Platform Porters & inspect the Waiting Room Lost-Property rack',
        labelBn: 'কুলি ও কর্মচারীদের দিয়ে ওয়েটিং রুম ও প্ল্যাটফর্মে খুঁজে দিন',
        isCorrect: true,
        replyBn: 'পেয়ে গেছি! কুলি ভাই ওয়েটিং রুমের বেঞ্চের পাশ থেকে উদ্ধার করেছে! অশেষ ধন্যবাদ!',
        replyEn: 'Found it! The porter retrieved it near the waiting room bench!',
        satisfactionDelta: 9,
        repDelta: 4,
        xpDelta: 45,
        moneyDelta: 40,
        complaintDelta: 0,
      },
      {
        id: 'dismiss_luggage',
        label: 'Tell them lost bags are not the railway station’s responsibility',
        labelBn: 'হারানো ব্যাগের দায়িত্ব রেলওয়ের নয় বলে ফিরিয়ে দিন',
        isCorrect: false,
        replyBn: 'এমন দায়িত্বহীন কথা শুনে খুব হতাশ হলাম!',
        replyEn: 'Deeply disappointed by such irresponsible attitude!',
        satisfactionDelta: -10,
        repDelta: -5,
        xpDelta: 0,
        moneyDelta: 0,
        complaintDelta: 1,
      },
    ],
  },
  {
    kind: 'missing_child',
    title: 'Missing Child Alert',
    titleBn: 'হারানো শিশু উদ্ধার',
    preferredRole: 'family',
    preferredZone: 'waiting_room',
    questionBn: 'হায় আল্লাহ! ভিড়ের মধ্যে আমার ছোট ছেলেটাকে খুঁজে পাচ্ছি না! দয়া করে সাহায্য করুন!',
    questionEn: 'Oh no! My young child wandered off in the station crowd! Please help!',
    choices: [
      {
        id: 'pa_and_grp',
        label: 'Broadcast an immediate Bengali PA announcement & dispatch Railway Police to check stalls',
        labelBn: 'মাইকে বাংলায় ঘোষণা দিন এবং রেল পুলিশ পাঠিয়ে চা-দোকান ও ওয়েটিং রুম খুঁজুন',
        isCorrect: true,
        replyBn: 'আলহামদুলিল্লাহ! ফলের দোকানের সামনে পুলিশ ভাই ওকে পেয়েছে! চিরকৃতজ্ঞ!',
        replyEn: 'Thank goodness! Railway Police found the child safely by the fruit stall!',
        satisfactionDelta: 12,
        repDelta: 6,
        xpDelta: 60,
        moneyDelta: 55,
        complaintDelta: 0,
      },
      {
        id: 'wait_and_see',
        label: 'Ask the parent to wait quietly until the next train leaves',
        labelBn: 'পরের ট্রেন ছাড়া পর্যন্ত চুপ করে অপেক্ষা করতে বলুন',
        isCorrect: false,
        replyBn: 'বাচ্চা হারিয়ে গেছে আর আপনি অপেক্ষা করতে বলছেন?!',
        replyEn: 'A child is missing and you tell me to just wait?!',
        satisfactionDelta: -14,
        repDelta: -7,
        xpDelta: 0,
        moneyDelta: 0,
        complaintDelta: 1,
      },
    ],
  },
  {
    kind: 'missed_train',
    title: 'Passenger Missed Train',
    titleBn: 'ট্রেন মিস সমস্যা',
    preferredRole: 'student',
    preferredZone: 'ticket_counter',
    questionBn: 'স্যার, জ্যামে পড়ে আমার ট্রেন মিস হয়ে গেছে! আমার পরীক্ষা আছে, এখন কীভাবে যাব?',
    questionEn: 'Sir, traffic delayed me and I missed my train! I have an exam—what can I do?',
    choices: [
      {
        id: 'endorse_next_commuter',
        label: 'Endorse ticket transfer at Ticket Counter for the next Commuter/Express train',
        labelBn: 'টিকিট কাউন্টার থেকে পরবর্তী কমিউটার/এক্সপ্রেস ট্রেনে সিট পরিবর্তনের ব্যবস্থা দিন',
        isCorrect: true,
        replyBn: 'স্যার আপনি আমার পরীক্ষা বাঁচিয়ে দিলেন! অনেক ধন্যবাদ!',
        replyEn: 'Sir, you just saved my exam! Thank you so much!',
        satisfactionDelta: 9,
        repDelta: 4,
        xpDelta: 40,
        moneyDelta: 35,
        complaintDelta: 0,
      },
      {
        id: 'charge_fine',
        label: 'Refuse help and tell them to leave the station',
        labelBn: 'কোনো সাহায্য না করে স্টেশন থেকে চলে যেতে বলুন',
        isCorrect: false,
        replyBn: 'একজন ছাত্রের বিপদে একটুও সহানুভূতি দেখালেন না!',
        replyEn: 'Zero empathy for a student in trouble!',
        satisfactionDelta: -9,
        repDelta: -4,
        xpDelta: 0,
        moneyDelta: 0,
        complaintDelta: 1,
      },
    ],
  },
  {
    kind: 'elderly_help',
    title: 'Elderly Assistance Needed',
    titleBn: 'বয়স্ক যাত্রীর সহায়তা',
    preferredRole: 'elderly',
    preferredZone: 'platform2',
    questionBn: 'বাবা, আমার হাঁটুতে ব্যথা—২ নম্বর প্ল্যাটফর্ম থেকে ফুটওভার ব্রিজ বেয়ে উঠতে পারছি না।',
    questionEn: 'Son, my knees hurt—I cannot climb the bridge alone from Platform 2.',
    choices: [
      {
        id: 'escort_crossing_porter',
        label: 'Assign a Porter & Railway Staff to safely escort across when tracks are clear',
        labelBn: 'ট্রেন না থাকলে কুলি ও স্টাফ দিয়ে নিরাপদে ক্রসিং পার করিয়ে দিন',
        isCorrect: true,
        replyBn: 'তোমার মতো দায়িত্বশীল মাস্টার থাকলে যাত্রীরা নিশ্চিন্ত থাকে!',
        replyEn: 'Passengers feel safe with a caring Station Master like you!',
        satisfactionDelta: 9,
        repDelta: 4,
        xpDelta: 45,
        moneyDelta: 35,
        complaintDelta: 0,
      },
      {
        id: 'force_stairs',
        label: 'Tell them to climb the stairs anyway with their heavy bag',
        labelBn: 'ভারী ব্যাগ নিয়ে একাই সিঁড়ি বেয়ে উঠতে বলুন',
        isCorrect: false,
        replyBn: 'উফ! এই বয়সে এত কষ্ট সহ্য হয় না বাবা।',
        replyEn: 'Oh dear, at this age that is far too hard.',
        satisfactionDelta: -10,
        repDelta: -4,
        xpDelta: 0,
        moneyDelta: 0,
        complaintDelta: 1,
      },
    ],
  },
  {
    kind: 'passenger_argument',
    title: 'Platform Seat Dispute',
    titleBn: 'যাত্রীদের বাকবিতণ্ডা',
    preferredRole: 'passenger',
    preferredZone: 'platform1',
    questionBn: 'মাস্টার সাহেব, দেখুন—উনি আমার রাখা ব্যাগ সরিয়ে পুরো বেঞ্চ দখল করে বসে আছেন!',
    questionEn: 'Station Master! He pushed my bag off and is blocking the entire bench!',
    choices: [
      {
        id: 'mediate_fairly',
        label: 'Mediate calmly with Ticket Collector so elderly & ticketed passengers share seats fairly',
        labelBn: 'টিসি সাথে নিয়ে শান্তভাবে উভয়কে বুঝিয়ে বেঞ্চে সমান বসার জায়গা করে দিন',
        isCorrect: true,
        replyBn: 'দারুণ বিচার করেছেন! এখন আর কোনো ঝামেলা নেই।',
        replyEn: 'Fair mediation! Everything is peaceful now.',
        satisfactionDelta: 8,
        repDelta: 4,
        xpDelta: 40,
        moneyDelta: 30,
        complaintDelta: 0,
      },
      {
        id: 'shout_both',
        label: 'Shout at both passengers and threaten to cancel their tickets',
        labelBn: 'দুজনের ওপর চিৎকার করে টিকিট বাতিলের হুমকি দিন',
        isCorrect: false,
        replyBn: 'ঝগড়া মেটানোর বদলে পরিস্থিতি আরও খারাপ করলেন!',
        replyEn: 'Instead of resolving the dispute, you made things worse!',
        satisfactionDelta: -9,
        repDelta: -4,
        xpDelta: 0,
        moneyDelta: 0,
        complaintDelta: 1,
      },
    ],
  },
  {
    kind: 'medical_emergency',
    title: 'Heat Exhaustion / Medical Aid',
    titleBn: 'জরুরি প্রাথমিক চিকিৎসা',
    preferredRole: 'passenger',
    preferredZone: 'platform1',
    questionBn: 'দ্রুত আসুন! গরমে একজন যাত্রীর মাথা ঘুরে পড়ে যাওয়ার অবস্থা—পানি আর ফাস্ট-এইড দরকার!',
    questionEn: 'Quick! A passenger is dizzy from the heat—needs water and first-aid!',
    choices: [
      {
        id: 'first_aid_ors',
        label: 'Bring cold water/saline from vendor & Station Office first-aid kit immediately',
        labelBn: 'দোকান থেকে ঠান্ডা পানি-স্যালাইন ও অফিসের ফার্স্ট-এইড বক্স দিয়ে সহায়তা করুন',
        isCorrect: true,
        replyBn: 'আলহামদুলিল্লাহ, স্যালাইন ও বাতাস পেয়ে এখন অনেক সুস্থ বোধ করছেন!',
        replyEn: 'Thank goodness, after saline and rest in the shade they are recovering well!',
        satisfactionDelta: 12,
        repDelta: 6,
        xpDelta: 55,
        moneyDelta: 50,
        complaintDelta: 0,
      },
      {
        id: 'delay_aid',
        label: 'Tell bystanders to leave them there until shift end',
        labelBn: 'শিফট শেষ হওয়া পর্যন্ত ওভাবেই রেখে দিতে বলুন',
        isCorrect: false,
        replyBn: 'জরুরি অবস্থায় এমন অবহেলা অমানবিক!',
        replyEn: 'Neglecting a medical emergency is unacceptable!',
        satisfactionDelta: -15,
        repDelta: -8,
        xpDelta: 0,
        moneyDelta: 0,
        complaintDelta: 1,
      },
    ],
  },
  {
    kind: 'overcrowded_platform',
    title: 'Overcrowded Platform Safety',
    titleBn: 'প্ল্যাটফর্মে অতিরিক্ত ভিড়',
    preferredRole: 'railway_police',
    preferredZone: 'platform1',
    questionBn: 'স্যার! প্ল্যাটফর্ম ১-এ প্রচুর যাত্রী হলুদ লাইনের খুব কাছে দাঁড়িয়ে পড়েছে—ট্রেন আসছে!',
    questionEn: 'Sir! Too many passengers are crowding right up to the yellow edge as a train nears!',
    choices: [
      {
        id: 'safety_pa_cordon',
        label: 'Trigger Bengali Safety PA warning & deploy Railway Police along the yellow line',
        labelBn: 'বাংলায় সতর্কীকরণ ঘোষণা দিন এবং পুলিশ দিয়ে হলুদ লাইনের পেছনে সরান',
        isCorrect: true,
        replyBn: 'সবাই নিরাপদ দূরত্বে সরে এসেছে, বড় দুর্ঘটনা এড়ানো গেল!',
        replyEn: 'Everyone stepped behind the yellow line—potential hazard averted!',
        satisfactionDelta: 10,
        repDelta: 5,
        xpDelta: 50,
        moneyDelta: 45,
        complaintDelta: 0,
      },
      {
        id: 'ignore_crowd',
        label: 'Do nothing—passengers will move on their own',
        labelBn: 'কিছু করার দরকার নেই, ট্রেন দেখলে নিজেই সরে যাবে',
        isCorrect: false,
        replyBn: 'হুইসেল ও নিরাপত্তার অভাবে প্ল্যাটফর্মে চরম বিশৃঙ্খলা তৈরি হলো!',
        replyEn: 'Without crowd control, the platform edge became chaotic and unsafe!',
        satisfactionDelta: -11,
        repDelta: -6,
        xpDelta: 0,
        moneyDelta: 0,
        complaintDelta: 1,
      },
    ],
  },
  {
    kind: 'confused_tourist',
    title: 'Confused International Tourist',
    titleBn: 'বিভ্রান্ত পর্যটক সহায়তা',
    preferredRole: 'tourist',
    preferredZone: 'forecourt',
    questionBn: 'Excuse me! আমি মৈত্রী/আন্তঃনগর ট্রেন আর বাংলা বোর্ড বুঝতে পারছি না—কোন দিকে যাব?',
    questionEn: 'Excuse me! I cannot read the Bangla timetable board—where do I board Intercity/Maitree?',
    choices: [
      {
        id: 'bilingual_guide',
        label: 'Explain in clear English/Bangla, show Ticket Counter & Platform 1 boarding gate',
        labelBn: 'ইংরেজি ও বাংলায় পরিষ্কারভাবে টিকিট কাউন্টার ও ১ নম্বর প্ল্যাটফর্ম দেখিয়ে দিন',
        isCorrect: true,
        replyBn: 'Thank you so much! Shaplapur Junction hospitality is amazing!',
        replyEn: 'Thank you so much! Shaplapur Junction hospitality is amazing!',
        satisfactionDelta: 8,
        repDelta: 4,
        xpDelta: 40,
        moneyDelta: 35,
        complaintDelta: 0,
      },
      {
        id: 'brush_off_tourist',
        label: 'Wave them away without explaining anything',
        labelBn: 'কিছু না বুঝিয়ে হাত নেড়ে চলে যেতে বলুন',
        isCorrect: false,
        replyBn: 'Oh dear, nobody here wants to help visitors...',
        replyEn: 'Oh dear, nobody here wants to help visitors...',
        satisfactionDelta: -8,
        repDelta: -4,
        xpDelta: 0,
        moneyDelta: 0,
        complaintDelta: 1,
      },
    ],
  },
  {
    kind: 'delay_complaint',
    title: 'Train Delay Complaint',
    titleBn: 'বিলম্ব সংক্রান্ত অভিযোগ',
    preferredRole: 'passenger',
    preferredZone: 'platform1',
    questionBn: 'বারবার শুধু দেরি হচ্ছে কেন? আমাদের নির্দিষ্ট সময় আর সঠিক ঘোষণা চাই!',
    questionEn: 'Why are trains delayed? We demand an accurate time update and PA announcement!',
    choices: [
      {
        id: 'transparent_pa',
        label: 'Apologize politely, explain track clearance, and broadcast exact Bangla delay update',
        labelBn: 'ভদ্রভাবে কারণ বুঝিয়ে সঠিক সময়ের বাংলা ঘোষণা প্রচার করুন',
        isCorrect: true,
        replyBn: 'সঠিক সময়ের আপডেট পেয়ে আমরা আশ্বস্ত হলাম। ধন্যবাদ মাস্টার সাহেব।',
        replyEn: 'Having an honest time update reassures everyone. Thank you.',
        satisfactionDelta: 8,
        repDelta: 3,
        xpDelta: 35,
        moneyDelta: 25,
        complaintDelta: 0,
      },
      {
        id: 'blame_passengers',
        label: 'Blame passengers for slow boarding and walk away',
        labelBn: 'যাত্রীদের দোষ দিয়ে ওখান থেকে সরে পড়ুন',
        isCorrect: false,
        replyBn: 'আমরা ঊর্ধ্বতন কর্তৃপক্ষের কাছে লিখিত অভিযোগ করব!',
        replyEn: 'We are filing a formal complaint with Railway HQ!',
        satisfactionDelta: -11,
        repDelta: -5,
        xpDelta: 0,
        moneyDelta: 0,
        complaintDelta: 1,
      },
    ],
  },
  {
    kind: 'lost_and_found',
    title: 'Pickpocket & Lost-and-Found Alert',
    titleBn: 'সন্দেহজনক পকেটমার ও মানিব্যাগ',
    preferredRole: 'pickpocket',
    preferredZone: 'ticket_counter',
    questionBn: 'একজন যাত্রীর মানিব্যাগ পড়ে গেছে, আর ওই সন্দেহভাজন লোকটা সেটা তুলে সরে পড়তে চাইছে!',
    questionEn: 'A wallet dropped near the Ticket Counter and a suspicious pickpocket is grabbing it!',
    choices: [
      {
        id: 'alert_police_recover',
        label: 'Stop the suspect with BD/Railway Police & return wallet to Lost-and-Found Desk',
        labelBn: 'পুলিশের সহায়তায় সন্দেহভাজনকে আটক করে মানিব্যাগটি প্রকৃত মালিককে ফিরিয়ে দিন',
        isCorrect: true,
        replyBn: 'হাতেনাতে ধরা পড়েছে! যাত্রী নিজের মানিব্যাগ ফিরে পেয়ে দারুণ খুশি!',
        replyEn: 'Caught red-handed! The passenger recovered their wallet safely!',
        satisfactionDelta: 11,
        repDelta: 6,
        xpDelta: 55,
        moneyDelta: 60,
        complaintDelta: 0,
      },
      {
        id: 'let_slip',
        label: 'Look the other way and ignore the incident',
        labelBn: 'না দেখার ভান করে এড়িয়ে যান',
        isCorrect: false,
        replyBn: 'স্টেশনে নিরাপত্তা বলে কিছু নেই নাকি?!',
        replyEn: 'Is there no security at this station at all?!',
        satisfactionDelta: -12,
        repDelta: -6,
        xpDelta: 0,
        moneyDelta: 0,
        complaintDelta: 1,
      },
    ],
  },
];

export function buildIncidentDialogue(
  npc: {
    id: string;
    name: string;
    nameBn: string;
    role: NpcRole;
    personality: NpcPersonality;
    memory: NpcMemory;
  },
  kind: StationEventKind,
): ActiveNpcDialogue {
  const spec = STATION_INCIDENT_SPECS.find((s) => s.kind === kind) ?? STATION_INCIDENT_SPECS[0];
  return {
    npcId: npc.id,
    npcName: npc.name,
    npcNameBn: npc.nameBn,
    role: npc.role,
    roleLabel: `${ROLE_LABELS[npc.role].en} · ${spec.title}`,
    personality: npc.personality,
    memorySummary: `${spec.titleBn} · Active Incident`,
    incidentKind: spec.kind,
    questionBn: spec.questionBn,
    questionEn: spec.questionEn,
    choices: spec.choices,
  };
}
