import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

interface PredefinedQuestion {
  id: string;
  question: string;
  answer: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const AdminQuestions: React.FC = () => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<PredefinedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<PredefinedQuestion | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: '',
    is_active: true
  });

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('predefined_questions')
        .select('*')
        .order('category', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingQuestion) {
        // Update existing question
        const { error } = await supabase
          .from('predefined_questions')
          .update({
            question: formData.question,
            answer: formData.answer,
            category: formData.category,
            is_active: formData.is_active
          })
          .eq('id', editingQuestion.id);

        if (error) throw error;
        
        toast({
          title: "Question Updated",
          description: "The question has been updated successfully",
        });
      } else {
        // Create new question
        const { error } = await supabase
          .from('predefined_questions')
          .insert({
            question: formData.question,
            answer: formData.answer,
            category: formData.category,
            is_active: formData.is_active
          });

        if (error) throw error;
        
        toast({
          title: "Question Created",
          description: "New question has been added successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingQuestion(null);
      setFormData({ question: '', answer: '', category: '', is_active: true });
      loadQuestions();
    } catch (error) {
      console.error('Error saving question:', error);
      toast({
        title: "Error",
        description: "Failed to save question",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (question: PredefinedQuestion) => {
    setEditingQuestion(question);
    setFormData({
      question: question.question,
      answer: question.answer,
      category: question.category,
      is_active: question.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const { error } = await supabase
        .from('predefined_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Question Deleted",
        description: "The question has been deleted successfully",
      });
      
      loadQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('predefined_questions')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Status Updated",
        description: `Question ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
      
      loadQuestions();
    } catch (error) {
      console.error('Error updating question status:', error);
      toast({
        title: "Error",
        description: "Failed to update question status",
        variant: "destructive",
      });
    }
  };

  const categories = [...new Set(questions.map(q => q.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Predefined Questions Management</h2>
          <p className="text-muted-foreground">
            Add, edit, and manage FAQ questions for customer support
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setEditingQuestion(null);
                setFormData({ question: '', answer: '', category: '', is_active: true });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingQuestion ? 'Edit Question' : 'Add New Question'}
              </DialogTitle>
              <DialogDescription>
                {editingQuestion ? 'Update the question details below' : 'Create a new predefined question for customer support'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select or enter category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Or enter new category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label htmlFor="question">Question</Label>
                <Textarea
                  id="question"
                  value={formData.question}
                  onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                  placeholder="Enter the question customers might ask..."
                  required
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="answer">Answer</Label>
                <Textarea
                  id="answer"
                  value={formData.answer}
                  onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
                  placeholder="Enter the answer to provide to customers..."
                  required
                  rows={5}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                />
                <Label htmlFor="is_active">Active (visible to customers)</Label>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {editingQuestion ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Loading questions...</p>
            </CardContent>
          </Card>
        ) : questions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-4">No questions created yet</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Question
              </Button>
            </CardContent>
          </Card>
        ) : (
          questions.map((question) => (
            <Card key={question.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{question.category}</Badge>
                      <Badge variant={question.is_active ? "default" : "secondary"}>
                        {question.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">{question.question}</h3>
                      <p className="text-muted-foreground text-sm line-clamp-3">
                        {question.answer}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(question.created_at).toLocaleDateString()}
                      {question.updated_at !== question.created_at && (
                        <span> • Updated: {new Date(question.updated_at).toLocaleDateString()}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(question.id, question.is_active)}
                    >
                      {question.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(question)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(question.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};