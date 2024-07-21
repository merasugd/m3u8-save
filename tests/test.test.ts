import m3u8 from '../src/index'

test('adds 1 + 2 to equal 3', async() => {
    let instance = new m3u8({
        streamUrl: 'https://ed.netmagcdn.com:2228/hls-playback/752ad0368988df8b656451ba1cd732cae60a4bd85247be071f5aa74c268f1a03ed9b258251f5e4c5bc5f4d74cdfdd1714d98cb1cfb50dcc0bdb018db66cc36975efd3312e5cececdfd6a55b933c181c3bdce61eb49c8efa141c8feefb1a47dead7ad2f9c378f250ec604deed0bf48f0f235fa408363bfcc1d537bcd8f04f1b9034c92c083f03e29754a081cc5bc3b91f/master.m3u8',
        output: 'out.mp4',
        cache: '.cache'
    })

    expect(await instance.startDownload()).toBe(100);
});