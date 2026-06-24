#!/usr/bin/env python3
"""App-local Bird-compatible CLI for X Action Engine."""
import argparse, json, os, sys
from httpx import Client
BEARER='AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA'
def find_key(obj,key):
    if isinstance(obj,dict):
        for k,v in obj.items():
            if k==key: yield v
            yield from find_key(v,key)
    elif isinstance(obj,list):
        for v in obj: yield from find_key(v,key)
def session(auth,ct0):
    c=Client(follow_redirects=True,timeout=25)
    c.headers.update({'authorization':f'Bearer {BEARER}','user-agent':'Mozilla/5.0 AppleWebKit/537.36 Chrome/124 Safari/537.36','content-type':'application/json','x-twitter-active-user':'yes','x-twitter-auth-type':'OAuth2Session','x-csrf-token':ct0 or '','referer':'https://x.com/home'})
    for d in ['.x.com','.twitter.com']:
        if auth: c.cookies.set('auth_token',auth,domain=d)
        if ct0: c.cookies.set('ct0',ct0,domain=d)
    return c
def convert(result):
    if result.get('__typename')=='TweetWithVisibilityResults': result=result.get('tweet') or {}
    legacy=result.get('legacy') or {}
    tid=result.get('rest_id') or legacy.get('id_str')
    if not tid or not legacy.get('full_text'): return None
    user=(result.get('core') or {}).get('user_results',{}).get('result',{})
    uleg=user.get('legacy') or {}
    media=[]
    for m in (legacy.get('entities') or {}).get('media',[]) or []:
        url=m.get('media_url_https') or m.get('media_url') or m.get('url')
        if url: media.append({'url':url})
    return {'id':str(tid),'text':legacy.get('full_text',''),'createdAt':legacy.get('created_at',''),'replyCount':legacy.get('reply_count',0),'retweetCount':legacy.get('retweet_count',0),'likeCount':legacy.get('favorite_count',0),'conversationId':legacy.get('conversation_id_str',''),'inReplyToId':legacy.get('in_reply_to_status_id_str',''),'authorId':user.get('rest_id',''),'author':{'username':uleg.get('screen_name',''),'name':uleg.get('name','')},'media':media}
def collect(data,n):
    out=[]; seen=set()
    for tr in find_key(data,'tweet_results'):
        t=convert((tr or {}).get('result') or {})
        if t and t['id'] not in seen:
            seen.add(t['id']); out.append(t)
            if len(out)>=n: break
    return out
def search(c,q,n,product='Latest'):
    # Current X SearchTimeline operation id used by twitter-api-client builds.
    url='https://x.com/i/api/graphql/nK1dw4oV3k4w5TdtcAdSww/SearchTimeline'
    variables={'rawQuery':q,'count':min(max(n,20),100),'querySource':'typed_query','product':product}
    features={'rweb_tipjar_consumption_enabled':True,'responsive_web_graphql_exclude_directive_enabled':True,'verified_phone_label_enabled':False,'creator_subscriptions_tweet_preview_api_enabled':True,'responsive_web_graphql_timeline_navigation_enabled':True,'responsive_web_graphql_skip_user_profile_image_extensions_enabled':False,'tweetypie_unmention_optimization_enabled':True,'responsive_web_edit_tweet_api_enabled':True,'graphql_is_translatable_rweb_tweet_is_translatable_enabled':True,'view_counts_everywhere_api_enabled':True,'longform_notetweets_consumption_enabled':True,'responsive_web_twitter_article_tweet_consumption_enabled':False,'tweet_awards_web_tipping_enabled':False,'freedom_of_speech_not_reach_fetch_enabled':True,'standardized_nudges_misinfo':True,'tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled':True,'longform_notetweets_rich_text_read_enabled':True,'longform_notetweets_inline_media_enabled':True,'responsive_web_media_download_video_enabled':False,'responsive_web_enhance_cards_enabled':False}
    params={'variables':json.dumps(variables),'features':json.dumps(features),'fieldToggles':json.dumps({'withArticleRichContentState':False})}
    r=c.get(url,params=params)
    if r.status_code>=400:
        from pathlib import Path
        Path(__file__).resolve().parents[1].joinpath('data','bird_error.txt').write_text(f'{r.status_code}\n{r.text[:4000]}')
        print(f'X search failed {r.status_code}: {r.text[:240]}',file=sys.stderr)
        sys.exit(2 if r.status_code == 429 else 1)
    data=r.json()
    tweets=collect(data,n)
    if not tweets:
        from pathlib import Path
        Path(__file__).resolve().parents[1].joinpath("data","bird_last.json").write_text(json.dumps(data)[:200000])
    Path(__file__).resolve().parents[1].joinpath("data","bird_last_tweets.json").write_text(json.dumps(tweets, ensure_ascii=False)[:200000])
    return tweets
def main():
    p=argparse.ArgumentParser(); p.add_argument('command',choices=['search','home','mentions','user-tweets']); p.add_argument('terms',nargs='*'); p.add_argument('-n','--number',type=int,default=20); p.add_argument('--json',action='store_true'); p.add_argument('--auth-token',default=os.environ.get('X_AUTH_TOKEN','')); p.add_argument('--ct0',default=os.environ.get('X_CT0',''))
    a=p.parse_args(); c=session(a.auth_token,a.ct0)
    if a.command=='search': q=' '.join(a.terms)
    elif a.command=='home': q='(AI OR LLM OR agents OR startup OR developer OR product OR SaaS) lang:en -filter:replies'
    elif a.command=='mentions': q='@'+(os.environ.get('X_USERNAME') or os.environ.get('YOUR_USERNAME') or 'papr_ai')+' lang:en'
    else:
        user=(a.terms[0] if a.terms else os.environ.get('X_USERNAME','')).lstrip('@'); q=f'from:{user}' if user else '(AI OR agents) lang:en'
    print(json.dumps({'tweets':search(c,q,a.number)},ensure_ascii=False))
if __name__=='__main__': main()
