import { createClient } from '@supabase/supabase-js';
import { Profile, Post, Comment, Message, Block, Report, Feedback } from '../types';

const SUPABASE_URL = 'https://dndsodarfrolbztdesxh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1OLKklZ5K8HN17RC22m4nQ_PBtZvg8o';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Helper for generating custom unique IDs
export function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// PROFILES
export async function getProfile(id: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as Profile | null;
  } catch (error) {
    console.error('Error fetching profile from Supabase:', error);
    return null;
  }
}

export async function createProfile(profile: Partial<Profile>): Promise<Profile | null> {
  try {
    if (!profile.id) return null;
    const { data, error } = await supabase
      .from('profiles')
      .insert([profile])
      .select()
      .single();
    if (error) {
      console.error('Supabase error inserting profile:', error);
      throw error;
    }
    return data as Profile;
  } catch (error) {
    console.error('Error creating profile in Supabase:', error);
    return null;
  }
}

export async function updateProfile(id: string, updates: Partial<Profile>): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Profile;
  } catch (error) {
    console.error('Error updating profile in Supabase:', error);
    return null;
  }
}

export async function searchProfiles(queryText: string, currentUserId: string): Promise<Profile[]> {
  try {
    const blockedIds = await getBlockedIds(currentUserId);
    
    let q = supabase.from('profiles').select('*').neq('id', currentUserId);
    
    if (queryText.trim()) {
      const formattedQuery = `%${queryText.toLowerCase()}%`;
      q = q.or(`first_name.ilike.${formattedQuery},last_name.ilike.${formattedQuery},username.ilike.${formattedQuery}`);
    }
    
    const { data, error } = await q;
    if (error) throw error;
    
    if (blockedIds.length > 0) {
      return (data as Profile[]).filter(p => !blockedIds.includes(p.id));
    }
    return data as Profile[];
  } catch (error) {
    console.error('Error searching profiles in Supabase:', error);
    return [];
  }
}

export async function getAllProfiles(currentUserId: string): Promise<Profile[]> {
  try {
    const blockedIds = await getBlockedIds(currentUserId);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId);
      
    if (error) throw error;
    
    if (blockedIds.length > 0) {
      return (data as Profile[]).filter(p => !blockedIds.includes(p.id));
    }
    return data as Profile[];
  } catch (error) {
    console.error('Error getting all profiles from Supabase:', error);
    return [];
  }
}

// POSTS
export async function getPosts(currentUserId: string, searchQuery?: string): Promise<Post[]> {
  try {
    const blockedIds = await getBlockedIds(currentUserId);
    
    let q = supabase.from('posts').select('*, profiles(*)').order('created_at', { ascending: false });
    
    const { data, error } = await q;
    if (error) throw error;
    
    let posts = data as unknown as Post[];
    
    if (blockedIds.length > 0) {
      posts = posts.filter(p => p.user_id && !blockedIds.includes(p.user_id));
    }
    
    if (searchQuery && searchQuery.trim()) {
      const s = searchQuery.toLowerCase();
      if (searchQuery.startsWith('#')) {
        posts = posts.filter(p => (p.hashtags || []).map(h => h.toLowerCase()).includes(s));
      } else {
        posts = posts.filter(p => (p.content || '').toLowerCase().includes(s));
      }
    }
    
    return posts;
  } catch (error) {
    console.error('Error getting posts from Supabase:', error);
    return [];
  }
}

export async function getUserPosts(userId: string): Promise<Post[]> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data as unknown as Post[];
  } catch (error) {
    console.error('Error getting user posts from Supabase:', error);
    return [];
  }
}

export async function createPost(post: Partial<Post>): Promise<Post | null> {
  try {
    const id = generateId();
    const newPost = {
      ...post,
      id
    };
    
    const { data, error } = await supabase
      .from('posts')
      .insert([newPost])
      .select('*, profiles(*)')
      .single();
      
    if (error) throw error;
    return data as unknown as Post;
  } catch (error) {
    console.error('Error creating post in Supabase:', error);
    return null;
  }
}

export async function updatePost(postId: string, updates: Partial<Post>): Promise<Post | null> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', postId)
      .select('*, profiles(*)')
      .single();
      
    if (error) throw error;
    return data as unknown as Post;
  } catch (error) {
    console.error('Error updating post in Supabase:', error);
    return null;
  }
}

export async function deletePost(postId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting post in Supabase:', error);
    return false;
  }
}

export async function incrementShares(postId: string, userId: string): Promise<Post | null> {
  try {
    // Note: Due to concurrency, a true increment should be an RPC call or simple fetch/update
    const { data: post, error: fetchError } = await supabase.from('posts').select('*').eq('id', postId).single();
    if (fetchError) throw fetchError;
    
    const shares = [...(post.shares || [])];
    if (!shares.includes(userId)) {
      shares.push(userId);
      const { data, error } = await supabase
        .from('posts')
        .update({ shares_count: shares.length, shares })
        .eq('id', postId)
        .select('*, profiles(*)')
        .single();
      if (error) throw error;
      return data as unknown as Post;
    }
    return post as unknown as Post;
  } catch (error) {
    console.error('Error incrementing shares in Supabase:', error);
    return null;
  }
}

export async function toggleLikePost(postId: string, userId: string): Promise<Post | null> {
  try {
    const { data: post, error: fetchError } = await supabase.from('posts').select('*').eq('id', postId).single();
    if (fetchError) throw fetchError;
    
    let likes = [...(post.likes || [])];
    if (likes.includes(userId)) {
      likes = likes.filter(id => id !== userId);
    } else {
      likes.push(userId);
    }
    
    const { data, error } = await supabase
      .from('posts')
      .update({ likes_count: likes.length, likes })
      .eq('id', postId)
      .select('*, profiles(*)')
      .single();
      
    if (error) throw error;
    return data as unknown as Post;
  } catch (error) {
    console.error('Error toggling like in Supabase:', error);
    return null;
  }
}

// COMMENTS
export async function getComments(postId: string): Promise<Comment[]> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(*)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    return data as unknown as Comment[];
  } catch (error) {
    console.error('Error getting comments from Supabase:', error);
    return [];
  }
}

export async function addComment(comment: Partial<Comment>): Promise<Comment | null> {
  try {
    const id = generateId();
    const newComment = {
      ...comment,
      id
    };
    
    const { data, error } = await supabase
      .from('comments')
      .insert([newComment])
      .select('*, profiles(*)')
      .single();
      
    if (error) throw error;
    
    if (comment.post_id) {
      const { data: post } = await supabase.from('posts').select('comments_count').eq('id', comment.post_id).single();
      if (post) {
        await supabase.from('posts').update({ comments_count: (post.comments_count || 0) + 1 }).eq('id', comment.post_id);
      }
    }
    
    return data as unknown as Comment;
  } catch (error) {
    console.error('Error adding comment in Supabase:', error);
    return null;
  }
}

export async function deleteComment(commentId: string, postId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) throw error;
    
    const { data: post } = await supabase.from('posts').select('comments_count').eq('id', postId).single();
    if (post) {
      await supabase.from('posts').update({ comments_count: Math.max(0, (post.comments_count || 1) - 1) }).eq('id', postId);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting comment in Supabase:', error);
    return false;
  }
}

// MESSAGES
export async function getMessages(userId: string, contactId: string): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    
    return (data as Message[]).filter(m => !(m.deleted_for || []).includes(userId));
  } catch (error) {
    console.error('Error getting messages from Supabase:', error);
    return [];
  }
}

export async function sendMessage(msg: Partial<Message>): Promise<Message | null> {
  try {
    const id = generateId();
    const newMsg = {
      ...msg,
      id,
      status: 'sent',
      deleted_for: []
    };
    
    const { data, error } = await supabase
      .from('messages')
      .insert([newMsg])
      .select()
      .single();
      
    if (error) throw error;
    return data as Message;
  } catch (error) {
    console.error('Error sending message in Supabase:', error);
    return null;
  }
}

export async function markMessagesAsRead(senderId: string, receiverId: string): Promise<void> {
  try {
    await supabase
      .from('messages')
      .update({ status: 'read' })
      .eq('sender_id', senderId)
      .eq('receiver_id', receiverId)
      .eq('status', 'sent');
  } catch (error) {
    console.error('Error marking messages as read in Supabase:', error);
  }
}

export async function deleteMessageForMe(msgId: string, userId: string): Promise<boolean> {
  try {
    const { data: msg, error: fetchError } = await supabase.from('messages').select('*').eq('id', msgId).single();
    if (fetchError) throw fetchError;
    
    const deletedFor = [...(msg.deleted_for || [])];
    if (!deletedFor.includes(userId)) {
      deletedFor.push(userId);
      const { error } = await supabase.from('messages').update({ deleted_for: deletedFor }).eq('id', msgId);
      if (error) throw error;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting message for me in Supabase:', error);
    return false;
  }
}

export async function deleteMessageForEveryone(msgId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({
        content: 'Mensaje eliminado',
        image_urls: [],
        location_lat: null,
        location_lng: null,
        location_name: null
      })
      .eq('id', msgId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting message for everyone in Supabase:', error);
    return false;
  }
}

// BLOCKS
export async function getBlockedIds(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('blocks')
      .select('*')
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
      
    if (error) throw error;
    
    const blockedIds: string[] = [];
    data.forEach(b => {
      if (b.blocker_id === userId) blockedIds.push(b.blocked_id);
      if (b.blocked_id === userId) blockedIds.push(b.blocker_id);
    });
    
    return Array.from(new Set(blockedIds));
  } catch (error) {
    console.error('Error getting blocked IDs from Supabase:', error);
    return [];
  }
}

export async function getBlockedUsers(userId: string): Promise<Profile[]> {
  try {
    const { data, error } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', userId);
      
    if (error) throw error;
    
    const ids = data.map(b => b.blocked_id);
    if (ids.length === 0) return [];
    
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids);
      
    if (pError) throw pError;
    return profiles as Profile[];
  } catch (error) {
    console.error('Error getting blocked users from Supabase:', error);
    return [];
  }
}

export async function blockUser(blockerId: string, blockedId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('blocks')
      .insert([{ blocker_id: blockerId, blocked_id: blockedId }]);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error blocking user in Supabase:', error);
    return false;
  }
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('blocks')
      .delete()
      .match({ blocker_id: blockerId, blocked_id: blockedId });
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error unblocking user in Supabase:', error);
    return false;
  }
}

// REPORTS
export async function createReport(report: Partial<Report>): Promise<boolean> {
  try {
    const id = generateId();
    const { error } = await supabase
      .from('reports')
      .insert([{ ...report, id }]);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating report in Supabase:', error);
    return false;
  }
}

export async function getAllReports(): Promise<Report[]> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*, profiles!reports_reporter_id_fkey(first_name, last_name, username)')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return data.map((r: any) => ({
      ...r,
      reporter_name: r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name} (@${r.profiles.username})` : 'Unknown'
    }));
  } catch (error) {
    console.error('Error getting reports from Supabase:', error);
    return [];
  }
}

// FEEDBACK
export async function createFeedback(fb: Partial<Feedback>): Promise<boolean> {
  try {
    const id = generateId();
    const { error } = await supabase
      .from('feedback')
      .insert([{ ...fb, id }]);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating feedback in Supabase:', error);
    return false;
  }
}

export async function getAllFeedback(): Promise<Feedback[]> {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('*, profiles(first_name, last_name, username)')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return data.map((f: any) => ({
      ...f,
      user_name: f.profiles ? `${f.profiles.first_name} ${f.profiles.last_name} (@${f.profiles.username})` : 'Unknown'
    }));
  } catch (error) {
    console.error('Error getting feedback from Supabase:', error);
    return [];
  }
}

export async function deleteReport(reportId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('reports').delete().eq('id', reportId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting report in Supabase:', error);
    return false;
  }
}

export async function deleteFeedback(feedbackId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('feedback').delete().eq('id', feedbackId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting feedback in Supabase:', error);
    return false;
  }
}

export async function banProfile(targetUserId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('profiles').delete().eq('id', targetUserId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error banning profile in Supabase:', error);
    return false;
  }
}
