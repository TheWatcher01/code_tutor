// File path: src/frontend/src/pages/UploadCourse.tsx

import React, { useState } from 'react';
import axios from 'axios';

const UploadCourse: React.FC = () => {
    const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
    const [title, setTitle] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [content, setContent] = useState<string>('');
    const [message, setMessage] = useState<string>('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(e.target.files);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!selectedFiles) {
            setMessage('Please select a file to upload');
            return;
        }

        const formData = new FormData();
        for (let i = 0; i < selectedFiles.length; i++) {
            formData.append('files', selectedFiles[i]);
        }
        formData.append('title', title);
        formData.append('description', description);
        formData.append('content', content);

        try {
            const response = await axios.post('http://localhost:5001/api/courses/add', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setMessage('Course uploaded successfully');
        } catch (error) {
            setMessage('Failed to upload course');
        }
    };

    return (
        <div>
            <h1>Upload Course</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor='title'>Title:</label>
                    <input
                        type='text'
                        id='title'
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label htmlFor='description'>Description:</label>
                    <input
                        type='text'
                        id='description'
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label htmlFor='content'>Content (optional):</label>
                    <textarea
                        id='content'
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor='files'>upload Course Files:</label>
                    <input
                        type='file'
                        id='files'
                        multiple
                        onChange={handleFileChange}
                        accept=".mp3,.wav,.txt,.pdf,.mp4,.avi,.mov,.jpeg,.jpg,.png,.md,.epub"
                        />
                </div>

                <button type='submit'>Upload Course</button>
            </form>

            {message && <p>{message}</p>}
        </div>
    );
}

export default UploadCourse;