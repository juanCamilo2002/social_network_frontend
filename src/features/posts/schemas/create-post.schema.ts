import * as yup from 'yup';

export const createPostSchema = yup.object({
  content: yup.string().trim().required('Escribe algo antes de publicar'),
});
