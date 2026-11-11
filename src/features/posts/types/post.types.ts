export interface Post {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    nickname: string;
    profilePicture: string | null;
  };
}
