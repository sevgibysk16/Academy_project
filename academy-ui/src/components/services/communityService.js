import axios from 'axios';

export const getCommunities = async () => {
  try {
    const response = await axios.get('http://localhost:8000/api/communities');
    return response.data;
  } catch (error) {
    console.error('Topluluklar alınamadı:', error);
    return [];
  }
};
