const apiUrl = 'https://api.devcon.org/sessions';

export const fetchSessions = async () => {

    try {
        const res = await fetch(apiUrl);
    
        const json = res.json();

        return 
    } catch (e) {
        console.error(e, 'failed to fetch sessions');

        return [];
    }
};