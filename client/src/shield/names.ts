/**
 * Gazetteer and heuristic data for client-side name detection.
 * Weak heuristic detector running offline in the browser.
 */

export const HONORIFICS = [
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
  "shri",
  "smt",
  "sri",
];

export const INTRO_CUES = [
  "my name is",
  "i am",
  "i'm",
  "this is",
  "call me",
  "myself",
  "name:",
];

export const NON_NAME_STOPLIST = new Set([
  "happy",
  "sorry",
  "fine",
  "good",
  "ready",
  "here",
  "there",
  "sure",
  "okay",
  "thanks",
  "thank",
  "hello",
  "writing",
  "asking",
  "calling",
  "looking",
  "trying",
  "wondering",
  "seeking",
  "curious",
  "excited",
  "glad",
  "interested",
  "testing",
  "working",
  "reading",
  "talking",
  "speaking",
  "available",
  "busy",
  "online",
  "offline",
  "able",
  "unable",
]);

// ~250 common Indian and international first names (excluding ambiguous English words like will, mark, rose, etc.)
export const COMMON_NAMES = new Set([
  // Indian names
  "aarav", "aanya", "aarohi", "aditya", "advait", "akash", "akhil", "amit", "amrita", "ananya",
  "anil", "anirudh", "ankit", "anushka", "arjun", "arun", "arvind", "ashok", "ashwin", "avinash",
  "ayush", "bhavna", "bharat", "chaitanya", "chetan", "daksh", "deepak", "deepika", "dev", "devi",
  "dhruv", "divya", "diya", "gaurav", "gayatri", "geeta", "gopal", "harish", "harsh", "himanshu",
  "ishaan", "isha", "ishita", "jagdish", "jatin", "jay", "jayant", "jitendra", "kalyan", "kamal",
  "karan", "kavita", "keshav", "kiran", "krishna", "kriti", "kumar", "kunal", "lakshmi", "lalit",
  "madhav", "mahesh", "manish", "manoj", "mayank", "meera", "mira", "mithun", "mohit", "mukesh",
  "nakul", "namrata", "naresh", "naveen", "navya", "neha", "nikhil", "nisha", "nitin", "pallavi",
  "pankaj", "parth", "pooja", "pradeep", "prakash", "pranav", "prasad", "prashant", "prateek", "preeti",
  "priya", "priyanka", "rahul", "raj", "rajat", "rajesh", "rajiv", "rakesh", "ram", "ramesh",
  "rashmi", "ravi", "renu", "rishabh", "ritesh", "rohit", "roopa", "sachin", "sameer", "sanjay",
  "sanjeev", "santosh", "sarita", "satish", "saurabh", "shalini", "shashi", "shikha", "shiv", "shiva",
  "shivam", "shobha", "shreya", "shubham", "shweta", "siddharth", "sneha", "sohan", "sonia", "sourabh",
  "subhash", "sudhir", "sumit", "sunil", "sunita", "suresh", "surya", "swati", "tanvi", "tarun",
  "tejas", "uday", "uma", "utkarsh", "vaibhav", "varun", "ved", "vidya", "vijay", "vikas",
  "vikram", "vimal", "vinay", "vinod", "vipin", "vishal", "vivek", "yash", "yogesh",

  // International names (carefully excluding everyday words)
  "alexander", "alexandra", "alessandro", "alfred", "alice", "alicia", "alison", "amanda", "amelia",
  "anastasia", "andrea", "andrew", "angela", "anthony", "antonio", "arthur", "barbara", "beatrice",
  "benjamin", "bernard", "bianca", "brenda", "brian", "bruno", "caitlin", "cameron", "carl", "carlos",
  "catherine", "charles", "charlotte", "chloe", "christopher", "clara", "claudia", "colin", "connor",
  "daniel", "danielle", "david", "deborah", "dennis", "diana", "diego", "dominic", "dylan", "edward",
  "eleanor", "elena", "elizabeth", "emily", "emma", "eric", "ethan", "eugene", "eva", "evelyn",
  "fiona", "francesca", "frederick", "gabriel", "gabriella", "geoffrey", "george", "giovanni", "gordon",
  "gregory", "hannah", "harold", "helen", "henry", "howard", "ian", "igor", "isabella", "jacob",
  "james", "jennifer", "jessica", "jonathan", "joseph", "joshua", "julia", "julian", "kevin",
  "laura", "leonard", "liam", "lucas", "lucia", "marcus", "maria", "matthew", "michael", "natalie",
  "nicholas", "nicolas", "oliver", "olivia", "patrick", "peter", "philip", "rachel", "richard", "robert",
  "samuel", "sarah", "sebastian", "simon", "sophia", "stephen", "thomas", "victor", "victoria", "vincent",
  "william", "xavier", "zachary"
]);

