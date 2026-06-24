/* ============================================================
   FACILITATOR EVALUATION RUBRIC
   Source: facilitator_evaluation_rubric_expanded_printable.docx
   ------------------------------------------------------------
   12 attributes, each scored 1-4, across 5 training days.
   Daily maximum = 48.  Five-day maximum = 240.

   TO EDIT THE RUBRIC: just change the text / attributes below.
   Everything in the app (rating page, dashboards, totals,
   flags, decision bands) is driven by this object.
   ============================================================ */

const RUBRIC = {
  scaleMin: 1,
  scaleMax: 4,
  days: 5,
  attributesCount: 12,
  dailyMax: 48,
  fiveDayMax: 240,

  // What each score level means in general
  scoreBands: {
    1: { label: "Concern",             color: "var(--s1)" },
    2: { label: "Developing",          color: "var(--s2)" },
    3: { label: "Ready / competent",   color: "var(--s3)" },
    4: { label: "Strong",              color: "var(--s4)" }
  },

  // Attributes whose score of 1 raises an automatic panel-review flag
  flagAttributes: ["Com", "NJ", "Att"],

  // Five-day total -> decision band (applied to projected /240 score)
  decisionBands: [
    { min: 204, max: 240, label: "Strong recommend", css: "band-strong",  note: "Consistently strong across values, facilitation practice, and feedback behavior." },
    { min: 168, max: 203, label: "Recommend",        css: "band-ok",      note: "Generally ready; may need normal supervision or minor coaching." },
    { min: 132, max: 167, label: "Review / backup",  css: "band-review",  note: "Mixed evidence; may be usable as backup if gaps are specific and coachable." },
    { min: 0,   max: 131, label: "Not recommended",  css: "band-no",      note: "Insufficient evidence of the attributes required for safe participant-centered facilitation." }
  ],

  groups: [
    {
      name: "Core facilitation values",
      attributes: [
        {
          key: "Cur", name: "Curiosity",
          evidence: "Open-ended questions; follow-up probes; willingness to understand before advising.",
          levels: {
            1: "Assumes what participants need; rarely asks why/how; treats discussion as lecture; uses leading or judgmental prompts.",
            2: "Asks some questions, but mostly scripted or factual; limited follow-up; misses chances to understand barriers or motivations.",
            3: "Asks open and relevant questions; follows up respectfully; seeks context before giving direction or moving on.",
            4: "Uses thoughtful, non-leading probes that deepen discussion, invite quieter voices, and connect experiences to meeting objectives."
          }
        },
        {
          key: "Com", name: "Compassion",
          evidence: "Tone, body language, response to difficulty, care during sensitive disclosures.",
          levels: {
            1: "Dismissive, impatient, mocking, or insensitive; minimizes barriers such as family obligations, transport, fear, or pressure.",
            2: "Polite but mechanical; shows basic respect but misses discomfort, exclusion, emotion, or sensitive disclosures.",
            3: "Warm and respectful; validates concerns; responds to barriers without judgment; supports a safe space for sharing.",
            4: "Makes participants feel seen and safe; handles sensitive moments with care while keeping the session constructive."
          }
        },
        {
          key: "Hum", name: "Humility",
          evidence: "Balance of speaking/listening; response to correction; valuing participant knowledge.",
          levels: {
            1: "Dominates discussion; performs expertise; corrects harshly; imposes personal views; resists correction or feedback.",
            2: "Sometimes centers self; accepts feedback unevenly; explains too much instead of drawing from participant experience.",
            3: "Shares space; listens before responding; accepts correction; avoids showing off; adapts facilitation when needed.",
            4: "Consistently acts as facilitator rather than expert; credits participants; invites correction; adapts without defensiveness."
          }
        },
        {
          key: "Att", name: "Attentiveness",
          evidence: "Eye contact, listening, inclusion of quiet voices, time management, note accuracy.",
          levels: {
            1: "Distracted or careless; misses instructions, participant cues, time, group dynamics, or required details.",
            2: "Attention is uneven; notices obvious issues but needs reminders; may miss quiet participants or emerging tension.",
            3: "Tracks time, participation, content, and group mood; notices most cues and responds appropriately.",
            4: "Anticipates needs; notices quiet participants, discomfort, conflict, and logistics; summarizes accurately and follows through."
          }
        }
      ]
    },
    {
      name: "Interpersonal disposition",
      attributes: [
        {
          key: "Pat", name: "Patience",
          evidence: "Response to slow answers, repeated questions, confusion, delays, or emotional moments.",
          levels: {
            1: "Rushes people; interrupts; shows frustration when participants are slow, confused, repetitive, or emotional.",
            2: "Usually polite but may cut off discussion, hurry explanations, or become tense when the session slows down.",
            3: "Allows time for participants to think and speak; repeats instructions calmly; handles confusion without irritation.",
            4: "Creates a steady, spacious pace; supports quiet or hesitant participants; de-escalates delays without losing structure."
          }
        },
        {
          key: "NJ", name: "Non-Judgement",
          evidence: "Neutral language; response to disagreement; respect across party and social differences.",
          levels: {
            1: "Signals bias or contempt toward party, caste/ethnicity, class, age, education, experience, or political choices.",
            2: "Avoids overt judgment but subtly signals approval/disapproval; may make participants defensive or cautious.",
            3: "Maintains neutrality; validates diverse experiences; responds to disagreement without shaming or taking sides.",
            4: "Actively protects pluralism and dignity; reframes tense comments without moralizing, partisan cues, or blame."
          }
        },
        {
          key: "Dis", name: "General disposition / welcoming / energy",
          evidence: "Greeting, tone, posture, warmth, steadiness, and ability to maintain constructive energy.",
          levels: {
            1: "Cold, bored, dismissive, overbearing, or visibly uncomfortable; weak greeting and little effort to make people comfortable.",
            2: "Polite but flat or inconsistent; energy depends on audience; may not actively welcome quieter or new participants.",
            3: "Warm, steady, and professional; greets participants respectfully; maintains appropriate energy across the session.",
            4: "Creates an inviting atmosphere; energizes without dominating; makes participants comfortable and valued from arrival onward."
          }
        },
        {
          key: "Pro", name: "Proactiveness",
          evidence: "Preparation, ownership, problem-solving, follow-up, and attention to TOR deliverables.",
          levels: {
            1: "Waits to be told; ignores predictable problems; does not take ownership of preparation, attendance, or logistics.",
            2: "Acts after reminders; solves immediate issues but shows limited anticipation or follow-through.",
            3: "Prepares, asks clarifying questions, identifies likely issues, and handles basic logistical or participation barriers.",
            4: "Anticipates risks, proposes practical solutions, follows through, and communicates early without creating confusion."
          }
        }
      ]
    },
    {
      name: "Facilitation practice and feedback",
      attributes: [
        {
          key: "Ques", name: "Quality of Questions",
          evidence: "Clarity, openness, neutrality, sequencing, follow-up, and whether questions deepen discussion.",
          levels: {
            1: "Questions are leading, closed, confusing, judgmental, performative, or used mainly to display knowledge.",
            2: "Questions are mostly factual or generic; limited probing; wording may be unclear or not connected to the objective.",
            3: "Questions are clear, open, relevant, and invitational; they help participants reflect and share concrete experiences.",
            4: "Questions are concise, layered, locally grounded, and powerful; they surface barriers, strategies, and peer learning."
          }
        },
        {
          key: "Mock", name: "Performance in Mock",
          evidence: "Mock facilitation structure, inclusion, time management, transitions, and handling of disagreement.",
          levels: {
            1: "Instructions unclear; loses structure; unsafe or disrespectful dynamics emerge; time and objectives are poorly managed.",
            2: "Completes parts of the activity but structure, timing, transitions, or group management are uneven.",
            3: "Facilitates clearly and inclusively; manages time; gives understandable instructions; keeps discussion on objective.",
            4: "Confident and adaptive; handles conflict, dominant voices, and quiet participants well; transitions and summaries are strong."
          }
        },
        {
          key: "TakeFB", name: "Willingness to take Feedback",
          evidence: "Listening posture, questions after feedback, acknowledgement, and application across days.",
          levels: {
            1: "Defensive, dismissive, argumentative, excuse-making, or visibly closed when given feedback.",
            2: "Accepts feedback politely but passively; little reflection or visible change in later attempts.",
            3: "Listens carefully, asks clarifying questions, acknowledges gaps, and applies feedback in later practice.",
            4: "Actively seeks feedback, reflects accurately, shows visible improvement, and helps evaluators understand what changed."
          }
        },
        {
          key: "GiveFB", name: "Willingness to give Feedback",
          evidence: "Specificity, tone, actionability, balance, and respect when giving peer feedback.",
          levels: {
            1: "Feedback is harsh, vague, personal, competitive, humiliating, or avoided entirely when peer feedback is expected.",
            2: "Feedback is polite but too general, unclear, or not actionable; may overpraise to avoid discomfort.",
            3: "Gives specific, respectful, balanced, and actionable feedback linked to facilitation behavior.",
            4: "Gives generous and precise feedback that protects dignity, supports learning, and connects clearly to program objectives."
          }
        }
      ]
    }
  ]
};

/* Flat list of all 12 attributes in display order, for convenience */
const ATTRIBUTES = RUBRIC.groups.flatMap(g => g.attributes);
const ATTR_KEYS = ATTRIBUTES.map(a => a.key);
const ATTR_BY_KEY = Object.fromEntries(ATTRIBUTES.map(a => [a.key, a]));
