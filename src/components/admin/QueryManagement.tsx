import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { 
  MessageSquare, 
  Star, 
  TrendingUp, 
  ArrowRight, 
  Calendar, 
  User, 
  Tag,
  Plus,
  Edit,
  Check,
  X
} from 'lucide-react';

interface UnsatisfiedQuery {
  id: string;
  customer_id: string;
  query_text: string;
  ai_response: string;
  category: string;
  feedback: string;
  satisfaction_rating: number;
  created_at: string;
  is_escalated: boolean;
  escalation_id?: string;
  customers: {
    full_name: string;
    email: string;
  } | null;
}

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  is_active: boolean;
}

interface ResponseImprovement {
  id: string;
  original_response: string;
  improved_response: string;
  category: string;
  satisfaction_rating: number;
  subject: string;
  status: string;
  created_at: string;
}

export const QueryManagement: React.FC = () => {
  const { toast } = useToast();
  const [unsatisfiedQueries, setUnsatisfiedQueries] = useState<UnsatisfiedQuery[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [improvements, setImprovements] = useState<ResponseImprovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState<UnsatisfiedQuery | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [improvedResponse, setImprovedResponse] = useState('');
  const [newCategory, setNewCategory] = useState({ name: '', description: '', color: '#3B82F6' });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load unsatisfied queries
      const { data: queriesData, error: queriesError } = await supabase
        .from('unsatisfied_queries')
        .select('*')
        .eq('is_escalated', false)
        .order('created_at', { ascending: false });

      if (queriesError) throw queriesError;

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('query_categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;

      // Load improvements
      const { data: improvementsData, error: improvementsError } = await supabase
        .from('escalated_queries')
        .select('id, original_response, improved_response, category, satisfaction_rating, subject, status, created_at')
        .not('improved_response', 'is', null)
        .order('created_at', { ascending: false });

      if (improvementsError) throw improvementsError;

      setUnsatisfiedQueries((queriesData || []).map(q => ({ ...q, customers: null })));
      setCategories(categoriesData || []);
      setImprovements(improvementsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load query management data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const escalateQuery = async (query: UnsatisfiedQuery) => {
    try {
      // Create escalation
      const { data: escalation, error: escalationError } = await supabase
        .from('escalated_queries')
        .insert({
          customer_id: query.customers ? null : query.customer_id, // Will need to get customer_id properly
          subject: `Unsatisfied Query: ${query.query_text.substring(0, 50)}...`,
          description: `Customer provided ${query.satisfaction_rating}/5 rating. Feedback: ${query.feedback}`,
          original_response: query.ai_response,
          category: query.category,
          satisfaction_rating: query.satisfaction_rating,
          priority: query.satisfaction_rating <= 2 ? 3 : 2,
          status: 'pending'
        })
        .select()
        .single();

      if (escalationError) throw escalationError;

      // Mark query as escalated
      const { error: updateError } = await supabase
        .from('unsatisfied_queries')
        .update({ 
          is_escalated: true,
          escalation_id: escalation.id
        })
        .eq('id', query.id);

      if (updateError) throw updateError;

      toast({
        title: "Query Escalated",
        description: "Query has been escalated for further review",
      });

      loadData();
    } catch (error) {
      console.error('Error escalating query:', error);
      toast({
        title: "Error",
        description: "Failed to escalate query",
        variant: "destructive",
      });
    }
  };

  const saveImprovedResponse = async () => {
    if (!selectedQuery || !improvedResponse) return;

    try {
      // First escalate if not already escalated
      if (!selectedQuery.is_escalated) {
        await escalateQuery(selectedQuery);
      }

      // Update with improved response
      const { error } = await supabase
        .from('escalated_queries')
        .update({
          improved_response: improvedResponse,
          status: 'resolved'
        })
        .eq('id', selectedQuery.escalation_id);

      if (error) throw error;

      toast({
        title: "Response Improved",
        description: "Improved response has been saved",
      });

      setIsDialogOpen(false);
      setSelectedQuery(null);
      setImprovedResponse('');
      loadData();
    } catch (error) {
      console.error('Error saving improved response:', error);
      toast({
        title: "Error",
        description: "Failed to save improved response",
        variant: "destructive",
      });
    }
  };

  const createCategory = async () => {
    if (!newCategory.name) return;

    try {
      const { error } = await supabase
        .from('query_categories')
        .insert({
          name: newCategory.name,
          description: newCategory.description,
          color: newCategory.color
        });

      if (error) throw error;

      toast({
        title: "Category Created",
        description: "New query category has been created",
      });

      setNewCategory({ name: '', description: '', color: '#3B82F6' });
      loadData();
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    }
  };

  const updateCategory = async (category: Category) => {
    try {
      const { error } = await supabase
        .from('query_categories')
        .update({
          name: category.name,
          description: category.description,
          color: category.color,
          is_active: category.is_active
        })
        .eq('id', category.id);

      if (error) throw error;

      toast({
        title: "Category Updated",
        description: "Category has been updated successfully",
      });

      setEditingCategory(null);
      loadData();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
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

  const getRatingColor = (rating: number) => {
    if (rating <= 2) return 'destructive';
    if (rating <= 3) return 'default';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Query Management</h2>
        <p className="text-muted-foreground">
          Manage unsatisfied queries, categorization, and response improvements
        </p>
      </div>

      <Tabs defaultValue="unsatisfied" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="unsatisfied">Unsatisfied Queries</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="improvements">Improvements</TabsTrigger>
        </TabsList>

        {/* Unsatisfied Queries Tab */}
        <TabsContent value="unsatisfied" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Unsatisfied Queries ({unsatisfiedQueries.length})
            </h3>
          </div>

          {loading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">Loading queries...</p>
              </CardContent>
            </Card>
          ) : unsatisfiedQueries.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No unsatisfied queries found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Great job! All recent queries have received satisfactory responses.
                </p>
              </CardContent>
            </Card>
          ) : (
            unsatisfiedQueries.map((query) => (
              <Card key={query.id}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={getRatingColor(query.satisfaction_rating)}>
                            {query.satisfaction_rating}/5 stars
                          </Badge>
                          {query.category && (
                            <Badge variant="outline">
                              <Tag className="h-3 w-3 mr-1" />
                              {query.category}
                            </Badge>
                          )}
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-sm text-muted-foreground">Customer Query:</h4>
                          <p className="text-sm">{query.query_text}</p>
                        </div>

                        <div>
                          <h4 className="font-semibold text-sm text-muted-foreground">AI Response:</h4>
                          <p className="text-sm bg-muted p-3 rounded">{query.ai_response}</p>
                        </div>

                        {query.feedback && (
                          <div>
                            <h4 className="font-semibold text-sm text-muted-foreground">Customer Feedback:</h4>
                            <p className="text-sm italic">{query.feedback}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {query.customers?.full_name || 'Unknown Customer'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(query.created_at)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedQuery(query);
                            setImprovedResponse(query.ai_response);
                            setIsDialogOpen(true);
                          }}
                        >
                          Improve Response
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => escalateQuery(query)}
                        >
                          Escalate
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Query Categories</h3>
          </div>

          {/* Create New Category */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create New Category
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="categoryName">Name</Label>
                  <Input
                    id="categoryName"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    placeholder="Category name"
                  />
                </div>
                <div>
                  <Label htmlFor="categoryDescription">Description</Label>
                  <Input
                    id="categoryDescription"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    placeholder="Category description"
                  />
                </div>
                <div>
                  <Label htmlFor="categoryColor">Color</Label>
                  <Input
                    id="categoryColor"
                    type="color"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={createCategory} disabled={!newCategory.name}>
                Create Category
              </Button>
            </CardContent>
          </Card>

          {/* Existing Categories */}
          <div className="grid gap-4">
            {categories.map((category) => (
              <Card key={category.id}>
                <CardContent className="p-4">
                  {editingCategory?.id === category.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          value={editingCategory.name}
                          onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        />
                        <Input
                          value={editingCategory.description}
                          onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                        />
                        <Input
                          type="color"
                          value={editingCategory.color}
                          onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => updateCategory(editingCategory)}>
                          <Check className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEditingCategory(null)}>
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        <div>
                          <h4 className="font-semibold">{category.name}</h4>
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        </div>
                        {!category.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingCategory(category)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Improvements Tab */}
        <TabsContent value="improvements" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Response Improvements ({improvements.length})
            </h3>
          </div>

          {improvements.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No response improvements yet</p>
              </CardContent>
            </Card>
          ) : (
            improvements.map((improvement) => (
              <Card key={improvement.id}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{improvement.subject}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getRatingColor(improvement.satisfaction_rating)}>
                            {improvement.satisfaction_rating}/5 stars
                          </Badge>
                          {improvement.category && (
                            <Badge variant="outline">{improvement.category}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(improvement.created_at)}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-semibold text-sm text-muted-foreground mb-2">Original Response:</h5>
                        <div className="bg-muted p-3 rounded text-sm">
                          {improvement.original_response}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-semibold text-sm text-muted-foreground mb-2">Improved Response:</h5>
                        <div className="bg-primary/10 p-3 rounded text-sm">
                          {improvement.improved_response}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Improve Response Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Improve Response</DialogTitle>
            <DialogDescription>
              Create an improved response for this unsatisfied customer query
            </DialogDescription>
          </DialogHeader>
          
          {selectedQuery && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-2">Customer Query:</h4>
                <p className="text-sm bg-muted p-3 rounded">{selectedQuery.query_text}</p>
              </div>

              <div>
                <Label htmlFor="improvedResponse">Improved Response</Label>
                <Textarea
                  id="improvedResponse"
                  value={improvedResponse}
                  onChange={(e) => setImprovedResponse(e.target.value)}
                  rows={6}
                  placeholder="Write an improved response that better addresses the customer's query..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveImprovedResponse} disabled={!improvedResponse}>
                  Save Improvement
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
