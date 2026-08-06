import { apiSlice } from './apiSlice';

export const uploadApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        uploadImage: builder.mutation<{ message: string; filePath: string }, FormData>({
            query: (data) => ({
                url: '/upload',
                method: 'POST',
                body: data,
            }),
        }),
    }),
});

export const { useUploadImageMutation } = uploadApi;
