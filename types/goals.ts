export interface GoalItem {
  id: string;
  user_id: string;
  title: string;
  price: number;
  quantity: number;
  amazon_url: string | null;
  image_url: string | null;
  is_purchased: boolean;
  created_at: string;
}

export interface AmazonPreviewResponse {
  success: boolean;
  title?: string | null;
  price?: number | null;
  imageUrl?: string | null;
  message?: string;
}
