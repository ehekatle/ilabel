```
请求
curl 'https://ocean.cdposs.qq.com/api/trpc/WorkReportServiceProxy/ListWorkData' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6' \
  -H 'content-type: application/json; charset=UTF-8' \
  -b 'ETCI=bf0b59a1bbbd4f1880ea47184e5ba352; logTrackKey=342c25ca09a044189b77f2351a6b74ef; openid=wangpengcheng; loginType=4; ocean_token_base=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvdWlkIjoiMjAwMDAwMDAxMDYyNiIsInVzZXJDb2RlIjowLCJvYXV0aFVzZXIiOnsib3BlblVpZCI6IndhbmdwZW5nY2hlbmciLCJvcGVuTmFtZSI6IueOi-m5j-eoiyJ9LCJvYXV0aFR5cGUiOjQsImlhdCI6MTc4MDQ1MDY2N30.zbygmNAeLw3RLicir4L6juj38HysWpP03dQSgIHMozA; ocean_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvdWlkIjoiMjAwMDAwMDAxMDYyNiIsInVzZXJDb2RlIjowLCJvYXV0aFVzZXIiOnsib3BlblVpZCI6IndhbmdwZW5nY2hlbmciLCJvcGVuTmFtZSI6IueOi-m5j-eoiyJ9LCJvYXV0aFR5cGUiOjQsImlhdCI6MTc4MDQ1MDY2N30.zbygmNAeLw3RLicir4L6juj38HysWpP03dQSgIHMozA' \
  -H 'origin: https://ocean.cdposs.qq.com' \
  -H 'priority: u=1, i' \
  -H 'referer: https://ocean.cdposs.qq.com/lark/manage/workload' \
  -H 'sec-ch-ua: "Chromium";v="148", "Microsoft Edge";v="148", "Not/A)Brand";v="99"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "Windows"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  -H 'traceparent: 00-0e14140d41c9b94f62990874a8da62ec-d6c9b4b097078a45-01' \
  -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0' \
  -H 'x-requested-with: XMLHttpRequest' \
  -H 'x-tc-language: zh-CN' \
  --data-raw '{"data":{"startTime":1777564800000,"endTime":1780243200000}}'
响应
{
    "code": 0,
    "data": {
        "records": [
            {
                "details": [
                    {
                        "taskId": "5523",
                        "taskName": "9637-审核-EC珠宝文玩专审1审-仙桃",
                        "taskQuantity": 0,
                        "manageEffective": 160,
                        "taskCostTime": "0",
                        "createTime": "1780449341000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 17,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 0,
                        "platformDisabled": false,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_PENDING",
                        "confirmTime": "0",
                        "source": "WORK_REPORT_SOURCE_AUTO",
                        "detailId": "13778218",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    },
                    {
                        "taskId": "5693",
                        "taskName": "9638-审核-EC珠宝文玩专审2审-仙桃",
                        "taskQuantity": 0,
                        "manageEffective": 160,
                        "taskCostTime": "0",
                        "createTime": "1780449341000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 7,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 0,
                        "platformDisabled": false,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_PENDING",
                        "confirmTime": "0",
                        "source": "WORK_REPORT_SOURCE_AUTO",
                        "detailId": "13778219",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    },
                    {
                        "taskId": "5696",
                        "taskName": "20292-珠宝切片V2正式审核-1审-仙桃",
                        "taskQuantity": 0,
                        "manageEffective": 160,
                        "taskCostTime": "0",
                        "createTime": "1780449341000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 13,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 0,
                        "platformDisabled": false,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_PENDING",
                        "confirmTime": "0",
                        "source": "WORK_REPORT_SOURCE_AUTO",
                        "detailId": "13778220",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    },
                    {
                        "taskId": "5697",
                        "taskName": "17331-EC珠宝文玩专审-预埋队列-仙桃",
                        "taskQuantity": 0,
                        "manageEffective": 160,
                        "taskCostTime": "0",
                        "createTime": "1780449341000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 3,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 0,
                        "platformDisabled": false,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_PENDING",
                        "confirmTime": "0",
                        "source": "WORK_REPORT_SOURCE_AUTO",
                        "detailId": "13778221",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    }
                ],
                "reportId": "1988861",
                "uin": "2000000010626",
                "userName": "王鹏程",
                "reportDate": "1780243200000",
                "attendanceTime": "540",
                "updateTime": "1780449341000",
                "isOffboarded": false
            },
            {
                "details": [
                    {
                        "taskId": "5703",
                        "taskName": "1936-珠宝开平直播审核（聚合）-仙桃",
                        "taskQuantity": 0,
                        "manageEffective": 240,
                        "taskCostTime": "0",
                        "createTime": "1780130520000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 0,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 173,
                        "platformDisabled": true,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_CONFIRMED",
                        "confirmTime": "1780130520000",
                        "source": "WORK_REPORT_SOURCE_MANUAL",
                        "detailId": "13718574",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    }
                ],
                "reportId": "1975634",
                "uin": "2000000010626",
                "userName": "王鹏程",
                "reportDate": "1780070400000",
                "attendanceTime": "0",
                "updateTime": "1780130520000",
                "isOffboarded": false
            },
            {
                "details": [
                    {
                        "taskId": "5523",
                        "taskName": "9637-审核-EC珠宝文玩专审1审-仙桃",
                        "taskQuantity": 0,
                        "manageEffective": 160,
                        "taskCostTime": "0",
                        "createTime": "1780103660000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 42,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 0,
                        "platformDisabled": false,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_CONFIRMED",
                        "confirmTime": "1780185600000",
                        "source": "WORK_REPORT_SOURCE_AUTO",
                        "detailId": "13714993",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    },
                    {
                        "taskId": "5693",
                        "taskName": "9638-审核-EC珠宝文玩专审2审-仙桃",
                        "taskQuantity": 0,
                        "manageEffective": 160,
                        "taskCostTime": "0",
                        "createTime": "1780103660000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 3,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 0,
                        "platformDisabled": false,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_CONFIRMED",
                        "confirmTime": "1780185600000",
                        "source": "WORK_REPORT_SOURCE_AUTO",
                        "detailId": "13714994",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    },
                    {
                        "taskId": "5696",
                        "taskName": "20292-珠宝切片V2正式审核-1审-仙桃",
                        "taskQuantity": 0,
                        "manageEffective": 160,
                        "taskCostTime": "0",
                        "createTime": "1780103660000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 13,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 0,
                        "platformDisabled": false,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_CONFIRMED",
                        "confirmTime": "1780185600000",
                        "source": "WORK_REPORT_SOURCE_AUTO",
                        "detailId": "13714995",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    },
                    {
                        "taskId": "5697",
                        "taskName": "17331-EC珠宝文玩专审-预埋队列-仙桃",
                        "taskQuantity": 0,
                        "manageEffective": 160,
                        "taskCostTime": "0",
                        "createTime": "1780103660000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 4,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 0,
                        "platformDisabled": false,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_CONFIRMED",
                        "confirmTime": "1780185600000",
                        "source": "WORK_REPORT_SOURCE_AUTO",
                        "detailId": "13714996",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    },
                    {
                        "taskId": "5701",
                        "taskName": "27943-审核-珠宝切片V2预埋审核队列-重庆\t",
                        "taskQuantity": 0,
                        "manageEffective": 160,
                        "taskCostTime": "0",
                        "createTime": "1780103660000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 1,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 0,
                        "platformDisabled": false,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_CONFIRMED",
                        "confirmTime": "1780185600000",
                        "source": "WORK_REPORT_SOURCE_AUTO",
                        "detailId": "13714997",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    }
                ],
                "reportId": "1974429",
                "uin": "2000000010626",
                "userName": "王鹏程",
                "reportDate": "1779897600000",
                "attendanceTime": "540",
                "updateTime": "1780388301000",
                "isOffboarded": false
            },
            {
                "details": [
                    {
                        "taskId": "5296",
                        "taskName": "招募队列",
                        "taskQuantity": 0,
                        "manageEffective": 230,
                        "taskCostTime": "0",
                        "createTime": "1780044809000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 0,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 0,
                        "platformDisabled": true,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_CONFIRMED",
                        "confirmTime": "1780044809000",
                        "source": "WORK_REPORT_SOURCE_MANUAL",
                        "detailId": "13703197",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    },
                    {
                        "taskId": "5703",
                        "taskName": "1936-珠宝开平直播审核（聚合）-仙桃",
                        "taskQuantity": 0,
                        "manageEffective": 240,
                        "taskCostTime": "0",
                        "createTime": "1780044809000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 0,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 151,
                        "platformDisabled": true,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_CONFIRMED",
                        "confirmTime": "1780044809000",
                        "source": "WORK_REPORT_SOURCE_MANUAL",
                        "detailId": "13703196",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    }
                ],
                "reportId": "1971896",
                "uin": "2000000010626",
                "userName": "王鹏程",
                "reportDate": "1779984000000",
                "attendanceTime": "0",
                "updateTime": "1780044809000",
                "isOffboarded": false
            },
            {
                "details": [
                    {
                        "taskId": "5296",
                        "taskName": "招募队列",
                        "taskQuantity": 0,
                        "manageEffective": 230,
                        "taskCostTime": "0",
                        "createTime": "1779872528000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 0,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 72,
                        "platformDisabled": true,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_CONFIRMED",
                        "confirmTime": "1779872528000",
                        "source": "WORK_REPORT_SOURCE_MANUAL",
                        "detailId": "13670804",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    },
                    {
                        "taskId": "5523",
                        "taskName": "9637-审核-EC珠宝文玩专审1审-仙桃",
                        "taskQuantity": 0,
                        "manageEffective": 160,
                        "taskCostTime": "0",
                        "createTime": "1779930798000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 40,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 0,
                        "platformDisabled": false,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_CONFIRMED",
                        "confirmTime": "1780012800000",
                        "source": "WORK_REPORT_SOURCE_AUTO",
                        "detailId": "13682480",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    },
                    {
                        "taskId": "5696",
                        "taskName": "20292-珠宝切片V2正式审核-1审-仙桃",
                        "taskQuantity": 0,
                        "manageEffective": 160,
                        "taskCostTime": "0",
                        "createTime": "1779930798000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 13,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 0,
                        "platformDisabled": false,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_CONFIRMED",
                        "confirmTime": "1780012800000",
                        "source": "WORK_REPORT_SOURCE_AUTO",
                        "detailId": "13682481",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    },
                    {
                        "taskId": "5697",
                        "taskName": "17331-EC珠宝文玩专审-预埋队列-仙桃",
                        "taskQuantity": 0,
                        "manageEffective": 160,
                        "taskCostTime": "0",
                        "createTime": "1779930798000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 3,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 0,
                        "platformDisabled": false,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_CONFIRMED",
                        "confirmTime": "1780012800000",
                        "source": "WORK_REPORT_SOURCE_AUTO",
                        "detailId": "13682482",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    },
                    {
                        "taskId": "5700",
                        "taskName": "25427-审核-EC珠宝首饰-二审预埋队列-仙桃",
                        "taskQuantity": 0,
                        "manageEffective": 160,
                        "taskCostTime": "0",
                        "createTime": "1779930798000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 1,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 0,
                        "platformDisabled": false,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_CONFIRMED",
                        "confirmTime": "1780012800000",
                        "source": "WORK_REPORT_SOURCE_AUTO",
                        "detailId": "13682483",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    },
                    {
                        "taskId": "5703",
                        "taskName": "1936-珠宝开平直播审核（聚合）-仙桃",
                        "taskQuantity": 0,
                        "manageEffective": 240,
                        "taskCostTime": "0",
                        "createTime": "1779872528000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 0,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 1,
                        "platformDisabled": true,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_CONFIRMED",
                        "confirmTime": "1779872528000",
                        "source": "WORK_REPORT_SOURCE_MANUAL",
                        "detailId": "13670803",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    }
                ],
                "reportId": "1963778",
                "uin": "2000000010626",
                "userName": "王鹏程",
                "reportDate": "1779724800000",
                "attendanceTime": "540",
                "updateTime": "1779930798000",
                "isOffboarded": false
            },
            {
                "details": [
                    {
                        "taskId": "5703",
                        "taskName": "1936-珠宝开平直播审核（聚合）-仙桃",
                        "taskQuantity": 0,
                        "manageEffective": 240,
                        "taskCostTime": "0",
                        "createTime": "1779872488000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 0,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 153,
                        "platformDisabled": true,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_CONFIRMED",
                        "confirmTime": "1779872488000",
                        "source": "WORK_REPORT_SOURCE_MANUAL",
                        "detailId": "13670798",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    }
                ],
                "reportId": "1963774",
                "uin": "2000000010626",
                "userName": "王鹏程",
                "reportDate": "1779811200000",
                "attendanceTime": "0",
                "updateTime": "1779872488000",
                "isOffboarded": false
            },
            {
                "details": [
                    {
                        "taskId": "5296",
                        "taskName": "招募队列",
                        "taskQuantity": 0,
                        "manageEffective": 230,
                        "taskCostTime": "0",
                        "createTime": "1779612091000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 0,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 111,
                        "platformDisabled": true,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_CONFIRMED",
                        "confirmTime": "1779612091000",
                        "source": "WORK_REPORT_SOURCE_MANUAL",
                        "detailId": "13623648",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    },
                    {
                        "taskId": "5523",
                        "taskName": "9637-审核-EC珠宝文玩专审1审-仙桃",
                        "taskQuantity": 0,
                        "manageEffective": 160,
                        "taskCostTime": "0",
                        "createTime": "1779671552000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 30,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 0,
                        "platformDisabled": false,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_CONFIRMED",
                        "confirmTime": "1779753600000",
                        "source": "WORK_REPORT_SOURCE_AUTO",
                        "detailId": "13633656",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    },
                    {
                        "taskId": "5696",
                        "taskName": "20292-珠宝切片V2正式审核-1审-仙桃",
                        "taskQuantity": 0,
                        "manageEffective": 160,
                        "taskCostTime": "0",
                        "createTime": "1779671552000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 12,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 0,
                        "platformDisabled": false,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_CONFIRMED",
                        "confirmTime": "1779753600000",
                        "source": "WORK_REPORT_SOURCE_AUTO",
                        "detailId": "13633657",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    },
                    {
                        "taskId": "5697",
                        "taskName": "17331-EC珠宝文玩专审-预埋队列-仙桃",
                        "taskQuantity": 0,
                        "manageEffective": 160,
                        "taskCostTime": "0",
                        "createTime": "1779671552000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 2,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 0,
                        "platformDisabled": false,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_CONFIRMED",
                        "confirmTime": "1779753600000",
                        "source": "WORK_REPORT_SOURCE_AUTO",
                        "detailId": "13633658",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    },
                    {
                        "taskId": "5700",
                        "taskName": "25427-审核-EC珠宝首饰-二审预埋队列-仙桃",
                        "taskQuantity": 0,
                        "manageEffective": 160,
                        "taskCostTime": "0",
                        "createTime": "1779671552000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 1,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 0,
                        "platformDisabled": false,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_CONFIRMED",
                        "confirmTime": "1779753600000",
                        "source": "WORK_REPORT_SOURCE_AUTO",
                        "detailId": "13633659",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    },
                    {
                        "taskId": "5703",
                        "taskName": "1936-珠宝开平直播审核（聚合）-仙桃",
                        "taskQuantity": 0,
                        "manageEffective": 240,
                        "taskCostTime": "0",
                        "createTime": "1779612091000",
                        "taskMagnitude": "0",
                        "url": "",
                        "isFreeTime": false,
                        "thirdTaskQuantity": 0,
                        "notThirdTaskQuantity": 0,
                        "ilabelAuditQuantity": 0,
                        "ilabelCheckQuantity": 0,
                        "kaipingAuditQuantity": 0,
                        "platformDisabled": true,
                        "confirmStatus": "WORK_REPORT_CONFIRM_STATUS_CONFIRMED",
                        "confirmTime": "1779612091000",
                        "source": "WORK_REPORT_SOURCE_MANUAL",
                        "detailId": "13623647",
                        "ilabelTransferQuantity": 0,
                        "taskCostTimeV2": 0
                    }
                ],
                "reportId": "1952976",
                "uin": "2000000010626",
                "userName": "王鹏程",
                "reportDate": "1779465600000",
                "attendanceTime": "540",
                "updateTime": "1779671552000",
                "isOffboarded": false
            },
			......
        ]
    },
    "msg": "ok"
}
按以上请求和响应信息，写一个油猴脚本
1. 对需求说明做如下规定：
	实际条=ilabelAuditQuantity+kaipingAuditQuantity，以蓝色标识
	标准条=实际条/manageEffective*1000,四舍五入保留两位小数,这里的manageEffective数值必须是对应条目下的，以绿色标识
		对于标准条之和的数据，也以计算出的标准条相同的颜色标识
		说明中的（实际条）/（标准条）/（标准条之和），有括号表示为仅显示对应数值
2. 以GM_registerMenuCommand注册一个按钮“查询窗口”用于打开弹窗
	对于请求中的token，使用credentials: 'include'让浏览器自动携带cookie
3. 弹窗标题为“百灵提报数据”，界面从上往下排列
	操作（以一行显示以保持紧凑）: 
		月份选择：
			选中月份后直接查出对应数据，无需单独的查询按钮
		队列筛选：
			提供如下按钮：“全部”、“1936”、“招募”、“ilabel”，以绿底/灰底表示选中/未选中状态，未全选时也可多选
			选中全部时所有队列都自动选中，所有数据只看对应队列数据
			修改选中状态时无需额外进行后台查询，只对已查到的结果进行筛选刷新显示即可
		颜色说明：
			放到最右侧，其中蓝色和绿色的说明文字以对应颜色圆形显示，示例如下：
			（蓝圆）实际条，（绿圆）标准条
	整月数据（以一行显示以保持紧凑）：
		当月标准条：（标准条之和）
		1936：（实际条）/（标准条）
		招募：（实际条）/（标准条）
		ilabel：（实际条）/（标准条）
	数据统览（按日历格式每日显示查询数据，日期以reportDate时间为准）: 
		其中每日数据分三种：
			1936（taskName为“1936-珠宝开平直播审核（聚合）-仙桃”）
			招募（taskName为“招募队列”）
			其它显示为ilabel(所有taskName不属于前两项的)
		每日数据按以下格式显示：
			日期号数 （标准条之和）
				标准条之和仅在不为0时显示，且和日期在一行以保证界面紧凑
			1936: （实际条）/（标准条）
			招募: （实际条）/（标准条）
			ilabel: （实际条）/（标准条）
				队列数据只在不为0的时候显示，否则不显示该行
4. 脚本文件头如下：
	// ==UserScript==
	// @name         百灵数据查询
	// @namespace    https://github.com/ehekatle/ilabel
	// @version      1.0
	// @description  按月份和队列查看工作数据，自动换算标准条
	// @author       ehekatle
	// @homepage     https://github.com/ehekatle/ilabel
	// @source       https://raw.githubusercontent.com/ehekatle/ilabel/main/larkData.user.js
	// @updateURL    https://www.tampermonkey.net/script_installation.php#url=https://cdn.gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/larkData.user.js
	// @downloadURL  https://cdn.gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/larkData.user.js
	......
以现代化界面完成，并保持界面紧凑以保证在至少1080p大小的屏幕下无需滚动即可看完一月数据
在脚本头文件中使用 @require 来引入成熟的第三方js库（注意使用国内能流畅访问的镜像）以保持脚本代码的精简，但不要使用vue，否则容易和使用vue的原页面有冲突
对于其它有疑问处，以常见需求完成
```
