import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ThumbsDown, Star, Send } from 'lucide-react';

interface QueryFeedbackProps {
  sessionId: string;
  messageId?: string;
  queryText: string;
  aiResponse?: string;
  onSubmit?: () => void;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

export const QueryFeedback: React.FC<QueryFeedbackProps> = ({
  sessionId,
  messageId,
  queryText,
  aiResponse,
  onSubmit
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [category, setCategory] = useState<string>('');
  const [feedback, setFeedback] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('query_categories')
        .select('id, name, color')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSubmit = async () => {
    if (!user || rating === 0) return;

    setLoading(true);
    try {
      // Get customer ID
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (customerError) throw customerError;

      // Submit unsatisfied query
      const { error } = await supabase
        .from('unsatisfied_queries')
        .insert({
          customer_id: customer.id,
          session_id: sessionId,
          message_id: messageId,
          query_text: queryText,
          ai_response: aiResponse,
          category: category || null,
          feedback: feedback || null,
          satisfaction_rating: rating
        });

      if (error) throw error;

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback. We'll use it to improve our responses.",
      });

      setIsOpen(false);
      setRating(0);
      setCategory('');
      setFeedback('');
      onSubmit?.();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-muted-foreground hover:text-foreground"
      >
        <ThumbsDown className="h-3 w-3 mr-1" />
        Not Helpful
      </Button>
    );
  }

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Help us improve</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            ×
          </Button>
        </div>

        <div>
          <Label>How would you rate this response?</Label>
          <div className="flex items-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="focus:outline-none"
              >
                <Star
                  className={`h-5 w-5 ${
                    star <= rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground hover:text-yellow-400'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="category">Category (Optional)</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="feedback">Additional Feedback (Optional)</Label>
          <Textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Please let us know how we can improve this response..."
            rows={3}
          />
        </div>

        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            Your feedback helps us improve AI responses
          </Badge>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || loading}
            size="sm"
          >
            <Send className="h-3 w-3 mr-1" />
            Submit Feedback
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};