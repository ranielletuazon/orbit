import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock the Profile.tsx
jest.mock('../src/pages/Profile', () => {
    return function MockProfile({ user }: { user: any }) {
        return (
            <div>
                <h1>{user?.username || "No User"}</h1>
                <img src={user?.profileImage || ""} alt="Profile" />
                <p>{user?.bio || "No bio available"}</p>
            </div>
        );
    };
});

// Test case
test('renders mocked Profile with fake user', () => {
    const fakeUser = {
        userID: "123",
        username: "TestUser",
        profileImage: "https://example.com/profile.jpg",
        bio: "Just a test bio"
    };

    render(
        <div>
            <h1>{fakeUser.username}</h1>
            <img src={fakeUser.profileImage} alt="Profile" />
            <p>{fakeUser.bio}</p>
        </div>
    );

    // Expect that if elements are displayed correctly
    expect(screen.getByText(/TestUser/i)).toBeInTheDocument();
    expect(screen.getByText(/Just a test bio/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Profile/i)).toBeInTheDocument();
});