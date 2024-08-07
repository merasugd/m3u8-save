import m3u8 from '../build/index';

test('download', async () => {
  const instance = new m3u8({
    streamUrl:
      'https://wf1.biananset.net/_v7/d8ba2bdf6ae1fb8f5cd30e48daf3115f49b4bc6525a6a2d4f724a48c9cf6eb4c3f6f14b1fa4cd78a0b2c0af7296c823799d73891d3a7c224fd242cd96d0428ae07c6ea8bee9918a7597f7834b3a32da3ab7b3501c26fc9b746b8c10dde2a91b4955aec657728e4015c17e423e4a32de56730d0ef463370769b82c61f130887b7/master.m3u8',
    output: 'out.mp4',
    cache: '.cache',
    cb: console.log,
  });

  instance.on('segments_download:progress', data => {
    console.log(data);
  });

  instance.startDownload();
});
