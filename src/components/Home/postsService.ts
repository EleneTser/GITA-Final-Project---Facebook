import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import mockData from '../../data.json';

export const fetchAllPosts = (onPostsUpdate: (posts: any[]) => void) => {
  const formattedMockPosts = mockData.posts.map((post: any) => {
    const author = mockData.users.find((u: any) => u.id === post.userId);

    const formattedLikes = post.likes.map((userId: string) => {
      return mockData.users.find((u: any) => u.id === userId);
    }).filter(Boolean);

    const formattedComments = post.comments.map((comment: any) => {
      const commenter = mockData.users.find((u: any) => u.id === comment.userId);
      return {
        id: comment.id,
        text: comment.text,
        userId: comment.userId,
        userDisplayName: commenter ? commenter.name : 'Facebook User',
        userAvatar: commenter ? commenter.profileImage : '/images/users/Girl1.jpg',
      };
    });

    return {
      id: post.id,
      userId: post.userId,
      userDisplayName: author ? author.name : 'Facebook User',
      userAvatar: author ? author.profileImage : '/images/users/Girl1.jpg',
      content: post.description,
      image: post.image || null,
      createdAt: post.createdAt,
      likes: formattedLikes,
      comments: formattedComments
    };
  });

  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const livePosts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    onPostsUpdate([...livePosts, ...formattedMockPosts]);
  });

  return unsubscribe;
};