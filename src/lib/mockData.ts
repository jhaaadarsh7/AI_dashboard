export type UserEntry = {
  user_name: string;
  lastMessage?: string;
  lastSeen?: string;
  messageCount: number;
  conversationIds: string[]; // conversation_id (phone number/string)
};

// Small, shared mock dataset. conversationIds are treated as the unique conversation_id (phone)
export const STATIC_USERS: UserEntry[] = [
  {
    user_name: 'Himanshu',
    lastMessage: 'How about any food?',
    lastSeen: new Date().toISOString(),
    messageCount: 12,
    conversationIds: ['+15550000001', '+15550000002']
  },
  {
    user_name: 'Olivia',
    lastMessage: 'Any vegan options?',
    lastSeen: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    messageCount: 8,
    conversationIds: ['+15550000003']
  },
  {
    user_name: 'Carlos',
    lastMessage: 'Where is my order?',
    lastSeen: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    messageCount: 23,
    conversationIds: ['+15550000004', '+15550000005', '+15550000006']
  },
  {
    user_name: 'Sarah',
    lastMessage: 'Thanks for the help!',
    lastSeen: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    messageCount: 5,
    conversationIds: ['+15550000007']
  },
  {
    user_name: 'Alex',
    lastMessage: 'Can I change my order?',
    lastSeen: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    messageCount: 15,
    conversationIds: ['+15550000008', '+15550000009']
  },
  {
    user_name: 'Emma',
    lastMessage: 'What are your opening hours?',
    lastSeen: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    messageCount: 3,
    conversationIds: ['+15550000010']
  },
  {
    user_name: 'David',
    lastMessage: 'Perfect, thank you so much!',
    lastSeen: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    messageCount: 19,
    conversationIds: ['+15550000011', '+15550000012']
  },
  {
    user_name: 'Maya',
    lastMessage: 'Is delivery free today?',
    lastSeen: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    messageCount: 7,
    conversationIds: ['+15550000013']
  }
];
