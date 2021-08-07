import { VercelRequest, VercelResponse } from '@vercel/node'
import { getBuffer } from '../image'
import { dateFormat, handleError } from '../utils'
import { request } from '../utils'

export default async (req: VercelRequest, res: VercelResponse) => {
  const isImage =
    req.headers.accept?.includes('image') || req.query.format === 'image'

  const { data } = await request({
    path: '/ajax/illust/discovery',
    params: {
      mode: req.query.mode || 'safe',
      max: isImage ? 1 : req.query.max || 18,
    },
    headers: req.headers,
  })
  const list: any[] = data?.illusts || []
  list.forEach((item, index) => {
    if (item.isAdContainer) {
      list.splice(index, 1)
      return
    }

    if (!item.url) return

    // 传入的例子：
    // /-/c/250x250_80_a2/img-master/img/2007/09/09/22/14/07/20_p0_square1200.jpg

    // 将时间转换为日本时区，东 9 区
    let date = new Date(item.createDate)
    const targetTimezone = -9
    // date 与机器时间相差的分钟数
    const minDiff = date.getTimezoneOffset()
    // 转换
    date = new Date(
      date.getTime() + minDiff * 60 * 1000 - targetTimezone * 60 * 60 * 1000
    )

    // 直接从 thumb 替换，并不优雅 ×
    // const middle = item.url
    //   .replace(/^\/-/, '')
    //   .replace(/^\/c\/.+?\//, '/')
    //   .replace(/^\/(custom-thumb|img-master)/, '')
    //   .replace(/^\//, '')
    //   .split('_p0_')[0]
    // 由时间生成
    const middle = `img/${dateFormat('yyyy/MM/dd/hh/mm/ss', date)}/${item.id}`

    item.urls = {
      mini: `/-/c/48x48/img-master/${middle}_p0_square1200.jpg`,
      thumb: `/-/c/250x250_80_a2/img-master/${middle}_p0_square1200.jpg`,
      small: `/-/c/540x540_70/img-master/${middle}_p0_master1200.jpg`,
      regular: `/-/img-master/${middle}_p0_master1200.jpg`,
      original: `/-/img-original/${middle}_p0.jpg`,
    }
  })

  // return image
  if (isImage) {
    return res.send(list[0])
    const url = list[0].urls.regular.replace('/-/', '/')
    getBuffer(`https://i.pximg.net${url}`).then(
      ({ data, headers }) => {
        res.setHeader('content-type', headers?.['content-type'])
        res.setHeader('cache-control', `no-store`)
        res.status(200).send(Buffer.from(data, 'base64'))
      },
      (err) => {
        handleError(err, res)
      }
    )
    return
  }

  // return JSON
  res.send(list)
}