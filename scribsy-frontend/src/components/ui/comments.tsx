'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChatBubbleLeftIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';

interface Comment {
  id: number;
  note_id: number;
  user_id: number;
  username: string;
  content: string;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

interface CommentsProps {
  noteId: number;
  currentUserId: number;
}

export function Comments({ noteId, currentUserId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    loadComments();
  }, [noteId]);

  const loadComments = async () => {
    try {
      const data = await apiClient.getNoteComments(noteId);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const comment = await apiClient.createNoteComment(noteId, newComment.trim());
      setComments([comment, ...comments]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleToggleResolved = async (commentId: number, currentResolved: boolean) => {
    try {
      const updatedComment = await apiClient.updateNoteComment(noteId, commentId, undefined, !currentResolved);
      setComments(comments.map(c => c.id === commentId ? updatedComment : c));
    } catch (error) {
      console.error('Failed to toggle comment status:', error);
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async (commentId: number) => {
    if (!editContent.trim()) return;

    try {
      const updatedComment = await apiClient.updateNoteComment(noteId, commentId, editContent.trim());
      setComments(comments.map(c => c.id === commentId ? updatedComment : c));
      setEditingComment(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await apiClient.deleteNoteComment(noteId, commentId);
      setComments(comments.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="text-center py-4">Loading comments...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChatBubbleLeftIcon className="w-5 h-5" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new comment */}
        <div className="space-y-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button onClick={handleAddComment} disabled={!newComment.trim()}>
              Add Comment
            </Button>
          </div>
        </div>

        {/* Comments list */}
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-3 rounded-lg border ${
                comment.is_resolved 
                  ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                  : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm">{comment.username}</span>
                    <span className="text-xs text-gray-500">
                      {formatDate(comment.created_at)}
                    </span>
                    {comment.is_resolved && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Resolved
                      </span>
                    )}
                  </div>
                  
                  {editingComment === comment.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveEdit(comment.id)}>
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          onClick={() => setEditingComment(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {comment.content}
                    </p>
                  )}
                </div>

                {currentUserId === comment.user_id && (
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleResolved(comment.id, comment.is_resolved)}
                      title={comment.is_resolved ? 'Mark as unresolved' : 'Mark as resolved'}
                    >
                      {comment.is_resolved ? (
                        <XCircleIcon className="w-4 h-4 text-orange-500" />
                      ) : (
                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditComment(comment)}
                      title="Edit comment"
                    >
                      <PencilIcon className="w-4 h-4 text-blue-500" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteComment(comment.id)}
                      title="Delete comment"
                    >
                      <TrashIcon className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {comments.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No comments yet. Be the first to add one!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


