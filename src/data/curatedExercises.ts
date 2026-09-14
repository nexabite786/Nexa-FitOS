import { Exercise } from '../types/exercise';

export const CURATED_SYSTEM_EXERCISES: Exercise[] = [
  // CHEST
  {
    id: 'sys-bb-bench-press',
    name: 'Barbell Flat Bench Press',
    targetMuscleGroup: 'Chest',
    secondaryMuscles: ['Triceps', 'Shoulders'],
    equipment: 'Barbell',
    movementPattern: 'Push',
    exerciseType: 'Strength',
    difficulty: 'Intermediate',
    instructions: [
      'Lie flat on the bench with eyes directly under the racked barbell.',
      'Grip the bar slightly wider than shoulder-width, plant your feet firmly on the floor, and pull your shoulder blades down and back.',
      'Unrack the bar and hold it over your mid-chest with locked elbows.',
      'Inhale and lower the barbell with control until it gently touches the lower sternum, keeping elbows at a 45-degree angle to your torso.',
      'Drive the barbell upward explosively to full extension while keeping your glutes and upper back glued to the bench.'
    ],
    tips: [
      'Avoid flaring elbows out at 90 degrees to protect the shoulder joint.',
      'Maintain continuous leg drive and an active arch in the upper back.',
      'Do not bounce the bar off your chest.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-db-incline-press',
    name: 'Incline Dumbbell Bench Press',
    targetMuscleGroup: 'Chest',
    secondaryMuscles: ['Shoulders', 'Triceps'],
    equipment: 'Dumbbell',
    movementPattern: 'Push',
    exerciseType: 'Hypertrophy',
    difficulty: 'Beginner',
    instructions: [
      'Set an adjustable bench to an incline angle between 30 and 45 degrees.',
      'Sit back with dumbbells resting on your thighs, then kick them up to shoulder height as you recline.',
      'Retract your scapulae, brace your core, and press the dumbbells up above your clavicles.',
      'Lower the weights smoothly until the dumbbells are just outside your upper chest, maintaining a slight inward tilt.',
      'Press back up along a natural arc without clacking the dumbbells together at the top.'
    ],
    tips: [
      'Angles higher than 45 degrees shift tension away from upper pecs into the anterior deltoid.',
      'Keep wrists stacked directly over your elbows throughout the movement.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-db-flat-press',
    name: 'Flat Dumbbell Bench Press',
    targetMuscleGroup: 'Chest',
    secondaryMuscles: ['Triceps', 'Shoulders'],
    equipment: 'Dumbbell',
    movementPattern: 'Push',
    exerciseType: 'Hypertrophy',
    difficulty: 'Beginner',
    instructions: [
      'Sit on a flat bench with dumbbells on your knees.',
      'Kick the dumbbells up and lie back, stabilizing the weights directly above your chest.',
      'Pull your shoulders down and back into the bench with feet firmly planted.',
      'Lower the dumbbells steadily to chest level, feeling a deep stretch across the pectoral fibers.',
      'Press upward in a smooth pressing path, converging slightly toward the midline without touching.'
    ],
    tips: [
      'Allows greater unilateral freedom and pectoral stretch than a barbell.',
      'Keep your forearms vertical throughout the descent.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-push-up',
    name: 'Standard Push-Up',
    targetMuscleGroup: 'Chest',
    secondaryMuscles: ['Triceps', 'Core', 'Shoulders'],
    equipment: 'Bodyweight',
    movementPattern: 'Push',
    exerciseType: 'Endurance',
    difficulty: 'Beginner',
    instructions: [
      'Assume a high plank position with hands slightly wider than shoulder-width apart.',
      'Engage your glutes and core to create a rigid straight line from head to heels.',
      'Lower your body by bending at the elbows until your chest is about an inch off the floor.',
      'Keep elbows tracking back at roughly 45 degrees, avoiding shoulder shrugging.',
      'Press forcefully through the palms to return to the starting plank position.'
    ],
    tips: [
      'Do not allow your lower back to sag or hips to hike up.',
      'Focus on pressing the floor away from your sternum.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-cable-crossover',
    name: 'Cable Crossover / Chest Fly',
    targetMuscleGroup: 'Chest',
    secondaryMuscles: ['Shoulders'],
    equipment: 'Cable',
    movementPattern: 'Isolation',
    exerciseType: 'Hypertrophy',
    difficulty: 'Beginner',
    instructions: [
      'Set pulleys at shoulder or high position and grab both handles with a neutral grip.',
      'Take a step forward into a staggered stance with a slight forward lean at the hips.',
      'Maintain a soft bend in the elbows and spread your arms wide until you feel a chest stretch.',
      'Contract the chest muscles to bring your hands together in front of your lower chest.',
      'Hold the peak contraction for 1 second before controlling the return.'
    ],
    tips: [
      'Keep the elbow bend fixed throughout; do not turn this into a pressing movement.',
      'Focus on squeezing your inner bicep against your ribcage.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-pec-deck-fly',
    name: 'Pec Deck Machine Fly',
    targetMuscleGroup: 'Chest',
    secondaryMuscles: ['Shoulders'],
    equipment: 'Machine',
    movementPattern: 'Isolation',
    exerciseType: 'Hypertrophy',
    difficulty: 'Beginner',
    instructions: [
      'Adjust the seat so the handles sit at mid-chest height.',
      'Rest your back firmly against the pad and grasp the machine handles.',
      'With a slight bend in your elbows, squeeze your chest to sweep the levers together.',
      'Pause at the peak contraction for 1 second, then control the tempo back to the starting stretch.'
    ],
    tips: [
      'Keep shoulders depressed and avoid letting your back peel off the pad.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },

  // BACK
  {
    id: 'sys-bb-deadlift',
    name: 'Conventional Barbell Deadlift',
    targetMuscleGroup: 'Back',
    secondaryMuscles: ['Hamstrings', 'Glutes', 'Core', 'Forearms'],
    equipment: 'Barbell',
    movementPattern: 'Hinge',
    exerciseType: 'Strength',
    difficulty: 'Advanced',
    instructions: [
      'Stand with feet hip-width apart and the barbell over mid-foot.',
      'Hinge at the hips and grip the bar just outside your knees with a double overhand or hook grip.',
      'Drop your hips until shins touch the bar, pull chest tall, and wedge your lats tight.',
      'Take a deep belly breath and brace your core completely.',
      'Drive the floor away through your mid-foot, extending hips and knees simultaneously to a standing lockout.',
      'Hinge at the hips to return the bar along the same vertical line back to the floor.'
    ],
    tips: [
      'Never allow the lumbar spine to round into flexion during initiation.',
      'Keep the bar in contact with your legs throughout the pull.',
      'Reset each repetition from a dead stop.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-bb-bent-over-row',
    name: 'Bent-Over Barbell Row',
    targetMuscleGroup: 'Back',
    secondaryMuscles: ['Biceps', 'Core', 'Hamstrings'],
    equipment: 'Barbell',
    movementPattern: 'Pull',
    exerciseType: 'Strength',
    difficulty: 'Intermediate',
    instructions: [
      'Hold a barbell with an overhand grip slightly wider than shoulder-width.',
      'Hinge forward at the hips to a 45-degree torso angle, keeping the back flat and knees softly unlocked.',
      'Initiate the row by driving your elbows up and back toward your hip crease.',
      'Squeeze the shoulder blades together at the top of the pull without jerking your torso upward.',
      'Lower the barbell with full control until arms are extended.'
    ],
    tips: [
      'Pull with your elbows rather than your hands.',
      'Keep neck neutral by looking at a spot on the floor 6 feet ahead.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-pull-up',
    name: 'Bodyweight Pull-Up',
    targetMuscleGroup: 'Back',
    secondaryMuscles: ['Biceps', 'Forearms', 'Core'],
    equipment: 'Bodyweight',
    movementPattern: 'Pull',
    exerciseType: 'Strength',
    difficulty: 'Intermediate',
    instructions: [
      'Hang from an overhead pull-up bar using an overhand grip wider than shoulder-width.',
      'Engage your lats by pulling your shoulder blades down away from your ears (active hang).',
      'Drive your elbows down toward your hips and pull your chest up until your chin clears the bar.',
      'Pause briefly, then lower yourself under control back to a full dead hang.'
    ],
    tips: [
      'Avoid swinging or using momentum from your legs (strict form only).',
      'Think about driving elbows into your back pockets.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-lat-pulldown',
    name: 'Lat Pulldown',
    targetMuscleGroup: 'Back',
    secondaryMuscles: ['Biceps', 'Shoulders'],
    equipment: 'Cable',
    movementPattern: 'Pull',
    exerciseType: 'Hypertrophy',
    difficulty: 'Beginner',
    instructions: [
      'Sit facing the lat pulldown machine and secure your thighs firmly under the pads.',
      'Grasp the wide bar with an overhand grip and lean back approximately 10-15 degrees.',
      'Pull the bar down toward your upper chest, leading with your elbows.',
      'Squeeze your lats and middle back fibers at the bottom.',
      'Slowly resist the weight back up until your arms and lats are fully lengthened.'
    ],
    tips: [
      'Do not lean back excessively or turn the exercise into a horizontal row.',
      'Control the eccentric phase for 2 to 3 seconds.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-seated-cable-row',
    name: 'Seated Cable Row',
    targetMuscleGroup: 'Back',
    secondaryMuscles: ['Biceps', 'Core'],
    equipment: 'Cable',
    movementPattern: 'Pull',
    exerciseType: 'Hypertrophy',
    difficulty: 'Beginner',
    instructions: [
      'Sit upright on the cable row bench with feet against the footrests and knees slightly bent.',
      'Grasp the V-grip handle and push back to an upright 90-degree posture.',
      'Pull the attachment into your lower abdomen while driving elbows back and retracting the scapulae.',
      'Pause for 1 second at full contraction, then allow the weight to gently stretch your lats forward with a neutral spine.'
    ],
    tips: [
      'Keep your torso stable; avoid rocking back and forth from the lower back.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-single-arm-db-row',
    name: 'Single-Arm Dumbbell Row',
    targetMuscleGroup: 'Back',
    secondaryMuscles: ['Biceps', 'Core'],
    equipment: 'Dumbbell',
    movementPattern: 'Pull',
    exerciseType: 'Hypertrophy',
    difficulty: 'Beginner',
    instructions: [
      'Place one knee and hand on a flat bench to support your torso horizontally.',
      'Hold a dumbbell in the opposite hand with your arm extended toward the floor.',
      'Row the dumbbell smoothly toward your hip crease, keeping the elbow tucked close to your ribcage.',
      'Lower the dumbbell under control to a full stretch without twisting your spine.'
    ],
    tips: [
      'Avoid rotating the shoulders open at the top of the movement.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },

  // SHOULDERS
  {
    id: 'sys-bb-overhead-press',
    name: 'Standing Barbell Overhead Press',
    targetMuscleGroup: 'Shoulders',
    secondaryMuscles: ['Triceps', 'Core', 'Chest'],
    equipment: 'Barbell',
    movementPattern: 'Push',
    exerciseType: 'Strength',
    difficulty: 'Intermediate',
    instructions: [
      'Rack the barbell at mid-chest height. Grip just outside your shoulders.',
      'Unrack the bar and take two steps back, planting feet shoulder-width apart.',
      'Squeeze glutes, quads, and abdominals to create an unbreakable pillar of core stability.',
      'Tilt your head back slightly and press the bar vertically in a straight path.',
      'Once the bar clears your forehead, shift your head forward so your arms lock out directly over your ears.'
    ],
    tips: [
      'Do not hyperextend the lumbar spine; keep ribs pulled down.',
      'Actively press your traps up into the bar at full lockout.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-db-lateral-raise',
    name: 'Dumbbell Lateral Raise',
    targetMuscleGroup: 'Shoulders',
    secondaryMuscles: ['Forearms'],
    equipment: 'Dumbbell',
    movementPattern: 'Isolation',
    exerciseType: 'Hypertrophy',
    difficulty: 'Beginner',
    instructions: [
      'Stand tall holding a pair of light dumbbells at your sides with palms facing inward.',
      'Lean forward very slightly (5-10 degrees) and maintain a soft bend in the elbows.',
      'Raise the dumbbells out to the sides along the scapular plane until parallel to the floor.',
      'Lead with your elbows and maintain a neutral wrist position.',
      'Lower under strict control without bouncing weights off your hips.'
    ],
    tips: [
      'Do not shrug your neck up; depress traps to isolate lateral deltoid heads.',
      'Use light to moderate loads with high mechanical tension.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-cable-lateral-raise',
    name: 'Cable Lateral Raise',
    targetMuscleGroup: 'Shoulders',
    secondaryMuscles: [],
    equipment: 'Cable',
    movementPattern: 'Isolation',
    exerciseType: 'Hypertrophy',
    difficulty: 'Beginner',
    instructions: [
      'Set the cable pulley to hand or lowest level.',
      'Stand sideways to the stack, grip the single D-handle with the outside arm across your body.',
      'Raise the handle out and away to shoulder level in a smooth arc.',
      'Pause at the apex for constant tension, then lower with a 2-second eccentric cadence.'
    ],
    tips: [
      'Provides superior resistance curve tension at the bottom range compared to dumbbells.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-face-pull',
    name: 'Cable Face Pull',
    targetMuscleGroup: 'Shoulders',
    secondaryMuscles: ['Back'],
    equipment: 'Cable',
    movementPattern: 'Pull',
    exerciseType: 'Mobility',
    difficulty: 'Beginner',
    instructions: [
      'Attach a rope handle to a cable machine set at eye or forehead level.',
      'Grasp the ends of the rope with thumbs pointing backward (neutral grip).',
      'Step back to pull the weight taut and set a athletic staggered stance.',
      'Pull the rope directly toward your bridge of nose, separating hands apart and externally rotating shoulders.',
      'Hold the peak contraction with knuckles facing backwards behind ears before slowly returning.'
    ],
    tips: [
      'Essential for posterior deltoid growth and rotator cuff health.',
      'Ensure external rotation occurs at the end of the pull.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },

  // LEGS - QUADS
  {
    id: 'sys-bb-back-squat',
    name: 'Barbell Back Squat',
    targetMuscleGroup: 'Quads',
    secondaryMuscles: ['Glutes', 'Hamstrings', 'Core'],
    equipment: 'Barbell',
    movementPattern: 'Squat',
    exerciseType: 'Strength',
    difficulty: 'Intermediate',
    instructions: [
      'Position the barbell across your upper trapezius (high bar) or rear delts (low bar).',
      'Set feet roughly shoulder-width apart with toes turned out 15 to 30 degrees.',
      'Take a deep 360-degree diaphragmatic breath, brace your core, and unlock knees and hips together.',
      'Descend smoothly until hip crease dips below top of knee cap (parallel depth or below).',
      'Keep knees tracking inline with your toes and chest proud.',
      'Drive powerfully out of the hole through mid-foot to a standing position.'
    ],
    tips: [
      'Do not allow knees to cave inwards on the ascent.',
      'Keep your heel and big toe knuckle grounded at all times.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-bb-front-squat',
    name: 'Barbell Front Squat',
    targetMuscleGroup: 'Quads',
    secondaryMuscles: ['Core', 'Glutes'],
    equipment: 'Barbell',
    movementPattern: 'Squat',
    exerciseType: 'Strength',
    difficulty: 'Advanced',
    instructions: [
      'Rest the bar across anterior deltoids using a clean grip (fingertips under bar) or cross-arm grip.',
      'Keep elbows driven high and upper arms parallel to the floor.',
      'Descend into a deep upright squat, tracking knees forward over toes.',
      'Maintain an upright thoracic spine throughout the bottom turnaround.',
      'Drive straight up while keeping elbows lifted high.'
    ],
    tips: [
      'Demands high thoracic mobility and quad engagement with minimal forward torso lean.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-bulgarian-split-squat',
    name: 'Bulgarian Split Squat',
    targetMuscleGroup: 'Quads',
    secondaryMuscles: ['Glutes', 'Hamstrings', 'Core'],
    equipment: 'Dumbbell',
    movementPattern: 'Lunge',
    exerciseType: 'Hypertrophy',
    difficulty: 'Intermediate',
    instructions: [
      'Stand approximately 2 to 3 feet in front of a bench and place the top of your rear foot on the bench pad.',
      'Hold a dumbbell in each hand or at goblet position.',
      'Descend under control by bending the front knee until your back knee hovers just above the ground.',
      'Drive through the mid-foot of the front working leg to return to full extension.'
    ],
    tips: [
      'A slight forward torso lean emphasizes glutes; a vertical torso emphasizes quads.',
      'Distribute 85% of weight on the front working leg.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-leg-press',
    name: '45-Degree Leg Press',
    targetMuscleGroup: 'Quads',
    secondaryMuscles: ['Glutes', 'Hamstrings'],
    equipment: 'Machine',
    movementPattern: 'Squat',
    exerciseType: 'Hypertrophy',
    difficulty: 'Beginner',
    instructions: [
      'Sit into the machine seat with your back and hips firmly against the padded backrest.',
      'Place feet shoulder-width on the sled platform.',
      'Release safety handles and lower the sled smoothly until knees form a 90-degree angle.',
      'Press through full foot back to the top without slamming or hyperextending knees.'
    ],
    tips: [
      'Never allow your lower back or pelvis to curl off the back pad.',
      'Do not lock out knees aggressively at the top.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-leg-extension',
    name: 'Leg Extension Machine',
    targetMuscleGroup: 'Quads',
    secondaryMuscles: [],
    equipment: 'Machine',
    movementPattern: 'Isolation',
    exerciseType: 'Hypertrophy',
    difficulty: 'Beginner',
    instructions: [
      'Adjust the backrest so your knee joint aligns precisely with the machine pivot axis.',
      'Position the shin pad resting snug on lower shins just above ankles.',
      'Grasp side handles firmly and extend legs until straight.',
      'Squeeze the quadriceps hard for 1 second at the peak, then lower under a 3-second eccentric tempo.'
    ],
    tips: [
      'Keep hips planted down in the seat throughout the set.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-goblet-squat',
    name: 'Kettlebell Goblet Squat',
    targetMuscleGroup: 'Quads',
    secondaryMuscles: ['Glutes', 'Core'],
    equipment: 'Kettlebell',
    movementPattern: 'Squat',
    exerciseType: 'Strength',
    difficulty: 'Beginner',
    instructions: [
      'Hold a kettlebell or dumbbell vertically against your chest with both hands under the horns.',
      'Set feet shoulder-width apart with toes flared out slightly.',
      'Drop your hips down between your knees, keeping elbows inside thighs at full depth.',
      'Drive into the floor through your heels to stand tall.'
    ],
    tips: [
      'Ideal teaching variation for establishing pristine squat mechanics.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },

  // LEGS - HAMSTRINGS & GLUTES
  {
    id: 'sys-bb-rdl',
    name: 'Romanian Deadlift (Barbell RDL)',
    targetMuscleGroup: 'Hamstrings',
    secondaryMuscles: ['Glutes', 'Back', 'Core'],
    equipment: 'Barbell',
    movementPattern: 'Hinge',
    exerciseType: 'Hypertrophy',
    difficulty: 'Intermediate',
    instructions: [
      'Stand upright holding a barbell with an overhand grip at thigh level.',
      'Unlock your knees slightly and keep that knee angle rigid throughout.',
      'Hinge back by pushing your hips directly toward the wall behind you.',
      'Slide the bar down your thighs and shins until you feel a deep stretch in hamstrings (around mid-shin).',
      'Drive your hips forward powerfully to stand tall, contracting glutes at the top.'
    ],
    tips: [
      'This is a horizontal hip displacement movement, not a vertical squat.',
      'Keep the spine neutral and lats contracted to keep the bar close.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-db-rdl',
    name: 'Dumbbell Romanian Deadlift',
    targetMuscleGroup: 'Hamstrings',
    secondaryMuscles: ['Glutes', 'Core'],
    equipment: 'Dumbbell',
    movementPattern: 'Hinge',
    exerciseType: 'Hypertrophy',
    difficulty: 'Beginner',
    instructions: [
      'Hold a pair of dumbbells in front of your thighs with knuckles facing outward.',
      'Soften knees and hinge back at the hips, keeping dumbbells tracing close to legs.',
      'Lower until hamstrings reach end range stretch, pause, and squeeze glutes to lock out.'
    ],
    tips: [
      'Dumbbells allow more personalized wrist orientation and shoulder relief.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-lying-leg-curl',
    name: 'Lying Hamstring Leg Curl',
    targetMuscleGroup: 'Hamstrings',
    secondaryMuscles: ['Calves'],
    equipment: 'Machine',
    movementPattern: 'Isolation',
    exerciseType: 'Hypertrophy',
    difficulty: 'Beginner',
    instructions: [
      'Lie face down on the machine with ankles tucked beneath the padded roller.',
      'Grasp handles and plant your hips firmly against the contoured pad.',
      'Curl the weight up towards your glutes as far as possible.',
      'Pause at maximum knee flexion and lower with a controlled 3-second descent.'
    ],
    tips: [
      'Do not allow hips to lift off the bench as you curl.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-bb-hip-thrust',
    name: 'Barbell Hip Thrust',
    targetMuscleGroup: 'Glutes',
    secondaryMuscles: ['Hamstrings', 'Core'],
    equipment: 'Barbell',
    movementPattern: 'Hinge',
    exerciseType: 'Hypertrophy',
    difficulty: 'Intermediate',
    instructions: [
      'Sit on the ground with upper back against a sturdy bench, rolling a padded barbell over your hips.',
      'Position feet flat on the floor, shoulder-width apart, knees at approximately 90 degrees at top.',
      'Drive through your heels to elevate the hips until thighs and torso align parallel to the floor.',
      'Tuck your chin and look forward, squeezing the glutes forcefully at full lockout for 2 seconds.',
      'Lower hips slowly under control back toward the floor.'
    ],
    tips: [
      'Keep your ribs pinned down and avoid hyperextending the lower back at lockout.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-cable-kickback',
    name: 'Cable Glute Kickback',
    targetMuscleGroup: 'Glutes',
    secondaryMuscles: ['Hamstrings'],
    equipment: 'Cable',
    movementPattern: 'Isolation',
    exerciseType: 'Hypertrophy',
    difficulty: 'Beginner',
    instructions: [
      'Fasten an ankle strap to a low cable pulley and loop it onto your working ankle.',
      'Hinge slightly forward at the waist while gripping the machine frame for stability.',
      'Extend the leg backward in a diagonal arc using the glute, keeping knee softly unlocked.',
      'Hold the peak contraction for 1 second, then control the return.'
    ],
    tips: [
      'Avoid arching your lower back to cheat additional range of motion.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },

  // ARMS - BICEPS
  {
    id: 'sys-bb-bicep-curl',
    name: 'Barbell Bicep Curl',
    targetMuscleGroup: 'Biceps',
    secondaryMuscles: ['Forearms'],
    equipment: 'Barbell',
    movementPattern: 'Isolation',
    exerciseType: 'Hypertrophy',
    difficulty: 'Beginner',
    instructions: [
      'Stand upright holding a barbell with an underhand grip shoulder-width apart.',
      'Tuck elbows against ribs and pull your shoulders back.',
      'Curl the bar up toward your shoulders, keeping upper arms motionless.',
      'Squeeze the biceps at peak contraction, then lower slowly back to full elbow extension.'
    ],
    tips: [
      'Do not swing your torso or use hip momentum to launch the weight.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-db-incline-curl',
    name: 'Incline Dumbbell Curl',
    targetMuscleGroup: 'Biceps',
    secondaryMuscles: ['Forearms'],
    equipment: 'Dumbbell',
    movementPattern: 'Isolation',
    exerciseType: 'Hypertrophy',
    difficulty: 'Intermediate',
    instructions: [
      'Lie back against a bench inclined to 45-60 degrees with dumbbells hanging straight down.',
      'Supinate wrists and curl the dumbbells up without allowing elbows to swing forward.',
      'Experience a strong stretch in the long head of the bicep at the bottom.'
    ],
    tips: [
      'Keep head resting against the bench pad to prevent neck straining.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-hammer-curl',
    name: 'Dumbbell Hammer Curl',
    targetMuscleGroup: 'Biceps',
    secondaryMuscles: ['Forearms'],
    equipment: 'Dumbbell',
    movementPattern: 'Isolation',
    exerciseType: 'Hypertrophy',
    difficulty: 'Beginner',
    instructions: [
      'Stand upright holding dumbbells at your sides with neutral palms facing each other.',
      'Keep elbows pinned and curl weights upward towards shoulders.',
      'Lower under control to emphasize the brachialis and brachioradialis.'
    ],
    tips: [
      'Can be performed alternating or both arms simultaneously.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },

  // ARMS - TRICEPS
  {
    id: 'sys-cable-tricep-pushdown',
    name: 'Cable Tricep Rope Pushdown',
    targetMuscleGroup: 'Triceps',
    secondaryMuscles: ['Forearms'],
    equipment: 'Cable',
    movementPattern: 'Isolation',
    exerciseType: 'Hypertrophy',
    difficulty: 'Beginner',
    instructions: [
      'Attach a rope handle to a high cable pulley and grip with palms facing each other.',
      'Pin elbows tight against your ribs and lean slightly forward at the hips.',
      'Push the rope down by extending elbows, flaring the rope ends apart at the bottom for maximal lockout.',
      'Return the rope up to roughly chest height before executing the next rep.'
    ],
    tips: [
      'Keep upper arms locked in place like hinges.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-dips',
    name: 'Parallel Bar Dips',
    targetMuscleGroup: 'Triceps',
    secondaryMuscles: ['Chest', 'Shoulders'],
    equipment: 'Bodyweight',
    movementPattern: 'Push',
    exerciseType: 'Strength',
    difficulty: 'Intermediate',
    instructions: [
      'Mount parallel dip bars with arms fully locked out and shoulders depressed.',
      'Bend knees slightly and cross ankles.',
      'Lower yourself by flexing elbows until shoulders are below elbows (90 degrees).',
      'Press through palms to drive your body back up to full elbow extension.'
    ],
    tips: [
      'Stay upright for triceps focus; lean forward slightly for pectoral focus.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-skull-crushers',
    name: 'EZ-Bar Skull Crushers / Lying Triceps Extension',
    targetMuscleGroup: 'Triceps',
    secondaryMuscles: [],
    equipment: 'EZ Bar',
    movementPattern: 'Isolation',
    exerciseType: 'Hypertrophy',
    difficulty: 'Intermediate',
    instructions: [
      'Lie flat on a bench holding an EZ curl bar above your chest with a close overhand grip.',
      'Angle upper arms back slightly (approx 10 degrees towards head).',
      'Hinge only at the elbows to lower the bar towards your forehead or crown of head.',
      'Extend elbows smoothly to press the bar back up.'
    ],
    tips: [
      'Maintain stable upper arm positioning throughout the set.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },

  // CORE
  {
    id: 'sys-hanging-leg-raise',
    name: 'Hanging Leg / Knee Raise',
    targetMuscleGroup: 'Core',
    secondaryMuscles: ['Forearms'],
    equipment: 'Bodyweight',
    movementPattern: 'Isolation',
    exerciseType: 'Endurance',
    difficulty: 'Intermediate',
    instructions: [
      'Hang from a pull-up bar with an overhand grip and engaged shoulders.',
      'Without swinging, posteriorly tilt pelvis and raise your legs or knees up toward your chest.',
      'Pause for 1 second at top, then lower legs with complete control.'
    ],
    tips: [
      'Curling the pelvis is what activates the abdominal wall, not just swinging hip flexors.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-ab-wheel-rollout',
    name: 'Ab Wheel Rollout',
    targetMuscleGroup: 'Core',
    secondaryMuscles: ['Lats', 'Shoulders'],
    equipment: 'Other',
    movementPattern: 'Isolation',
    exerciseType: 'Strength',
    difficulty: 'Advanced',
    instructions: [
      'Kneel on a soft mat holding the ab wheel handles directly under your shoulders.',
      'Tuck your pelvis and brace abs tightly.',
      'Slowly roll the wheel forward, extending your body until your nose is just above the mat.',
      'Contract abs and pull the wheel back beneath your shoulders without breaking lumbar neutrality.'
    ],
    tips: [
      'Never allow the lower back to sag into extension during rollout.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-cable-woodchopper',
    name: 'Cable Woodchopper',
    targetMuscleGroup: 'Core',
    secondaryMuscles: ['Shoulders'],
    equipment: 'Cable',
    movementPattern: 'Rotation',
    exerciseType: 'Endurance',
    difficulty: 'Beginner',
    instructions: [
      'Set a cable pulley to high or shoulder height with a single handle.',
      'Stand perpendicular to the stack with feet wider than shoulder width.',
      'Rotate your torso downward and across your body towards the opposite hip in a chopping motion.',
      'Pivot on the back foot and return slowly under control.'
    ],
    tips: [
      'Generate rotational power from the hips and obliques, not arms.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-plank',
    name: 'Front Elbow Plank',
    targetMuscleGroup: 'Core',
    secondaryMuscles: ['Glutes', 'Shoulders'],
    equipment: 'Bodyweight',
    movementPattern: 'Isolation',
    exerciseType: 'Endurance',
    difficulty: 'Beginner',
    instructions: [
      'Lie face down and rest on your forearms, elbows directly beneath your shoulders.',
      'Raise hips so your body forms a straight line from head to heels.',
      'Squeeze glutes, brace abdominals like bracing for a punch, and breathe smoothly.'
    ],
    tips: [
      'Actively pull your elbows towards your toes to generate high tension irradiation.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },

  // CALVES
  {
    id: 'sys-standing-calf-raise',
    name: 'Standing Calf Raise',
    targetMuscleGroup: 'Calves',
    secondaryMuscles: [],
    equipment: 'Machine',
    movementPattern: 'Isolation',
    exerciseType: 'Hypertrophy',
    difficulty: 'Beginner',
    instructions: [
      'Place balls of feet on platform ledge with heels hanging off freely.',
      'Rest shoulder pads comfortably across traps with legs straight (soft knees).',
      'Lower heels deep into a full calf stretch for 2 seconds.',
      'Drive high up onto the balls of your feet into peak gastrocnemius contraction.'
    ],
    tips: [
      'Pause at bottom to dissipate the Achilles tendon stretch reflex.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },

  // FULL BODY / CARRY / POWER
  {
    id: 'sys-trap-bar-deadlift',
    name: 'Trap Bar / Hex Bar Deadlift',
    targetMuscleGroup: 'Full Body',
    secondaryMuscles: ['Quads', 'Hamstrings', 'Glutes', 'Back', 'Forearms'],
    equipment: 'Trap Bar',
    movementPattern: 'Hinge',
    exerciseType: 'Strength',
    difficulty: 'Beginner',
    instructions: [
      'Step inside the hexagonal frame with feet hip-width apart.',
      'Squat-hinge down and grip neutral handles firmly in the center.',
      'Chest tall, shoulders packed, push the earth away with feet and stand straight up.',
      'Lower under control to the floor.'
    ],
    tips: [
      'Allows a neutral grip and more balanced knee/hip flexion than conventional barbells.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-farmers-walk',
    name: "Farmer's Walk / Loaded Carry",
    targetMuscleGroup: 'Full Body',
    secondaryMuscles: ['Core', 'Forearms', 'Shoulders', 'Calves'],
    equipment: 'Dumbbell',
    movementPattern: 'Carry',
    exerciseType: 'Strength',
    difficulty: 'Beginner',
    instructions: [
      'Pick up a pair of heavy dumbbells or kettlebells with a secure grip.',
      'Stand tall with posture aligned: shoulders down and back, ribs down, pelvis neutral.',
      'Walk forward with short, deliberate, smooth footsteps for the designated distance or time.'
    ],
    tips: [
      'Prevent weights from swinging or tilting your torso.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'sys-kettlebell-swing',
    name: 'Russian Kettlebell Swing',
    targetMuscleGroup: 'Hamstrings',
    secondaryMuscles: ['Glutes', 'Core', 'Back'],
    equipment: 'Kettlebell',
    movementPattern: 'Hinge',
    exerciseType: 'Power',
    difficulty: 'Intermediate',
    instructions: [
      'Place kettlebell on the floor a foot in front of you. Hinge down and grip handle with both hands.',
      'Hike the kettlebell back between upper thighs like a football snap.',
      'Snap your hips forward violently, standing tall and projecting the bell to chest height.',
      'Let the bell fall back into the hip hinge cleanly before the next cycle.'
    ],
    tips: [
      'Do not lift with your arms or squat the kettlebell; power comes purely from explosive hip extension.'
    ],
    isCustom: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  }
];

export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Biceps',
  'Triceps',
  'Core',
  'Forearms',
  'Full Body'
] as const;

export const EQUIPMENT_LIST = [
  'Barbell',
  'Dumbbell',
  'Kettlebell',
  'Cable',
  'Machine',
  'Bodyweight',
  'Bands',
  'Trap Bar',
  'EZ Bar',
  'Other'
] as const;

export const MOVEMENT_PATTERNS = [
  'Push',
  'Pull',
  'Hinge',
  'Squat',
  'Lunge',
  'Carry',
  'Rotation',
  'Isolation',
  'Other'
] as const;

export const EXERCISE_TYPES = [
  'Strength',
  'Hypertrophy',
  'Endurance',
  'Mobility',
  'Power',
  'Cardio'
] as const;

export const DIFFICULTY_LEVELS = [
  'Beginner',
  'Intermediate',
  'Advanced'
] as const;
