/* Direct, authorized HTTP client for Samsung's documented Tizen Sockets extension. */
#include <curl/curl.h>
#include <emscripten/emscripten.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

static char *body;
static size_t length;
static long status;
static int failure;
static void clear_body(void) {
  if (body) { volatile char *p=body; size_t n=length; while(n--) *p++=0; free(body); }
  body=NULL;length=0;
}
static size_t append_body(char *data,size_t size,size_t count,void *unused) {
  size_t n=size*count;
  if(n>4*1024*1024 || length>4*1024*1024-n)return 0;
  char *next=realloc(body,length+n+1);
  if(!next)return 0;
  body=next;memcpy(body+length,data,n);length+=n;body[length]=0;return n;
}
EMSCRIPTEN_KEEPALIVE const char *portal_fetch(const char *url,const char *cookie,const char *authorization,const char *agent,const char *xagent,const char *language,int timeout) {
  clear_body();status=0;failure=0;
  if(!url || (strncmp(url,"http://",7) && strncmp(url,"https://",8)) || !cookie || strchr(cookie,'\r') || strchr(cookie,'\n') || (authorization && (strchr(authorization,'\r') || strchr(authorization,'\n'))) || (agent&&(strchr(agent,'\r')||strchr(agent,'\n'))) || (xagent&&(strchr(xagent,'\r')||strchr(xagent,'\n'))) || (language&&(strchr(language,'\r')||strchr(language,'\n')))) {failure=1;return "";}
  CURL *client=curl_easy_init();
  if(!client){failure=1;return "";}
  struct curl_slist *headers=curl_slist_append(NULL,"Accept: application/json");
  char auth[4200];
  if(authorization && authorization[0]) {snprintf(auth,sizeof(auth),"Authorization: %s",authorization);headers=curl_slist_append(headers,auth);}
  char extra[600];
  if(xagent && xagent[0]){snprintf(extra,sizeof(extra),"X-User-Agent: %.512s",xagent);headers=curl_slist_append(headers,extra);}
  if(language && language[0]){snprintf(extra,sizeof(extra),"Accept-Language: %.32s",language);headers=curl_slist_append(headers,extra);}
  curl_easy_setopt(client,CURLOPT_URL,url);
  curl_easy_setopt(client,CURLOPT_HTTPHEADER,headers);
  curl_easy_setopt(client,CURLOPT_COOKIE,cookie);
  curl_easy_setopt(client,CURLOPT_USERAGENT,agent&&agent[0]?agent:"IPTV TORONTO/0.2 (Samsung Tizen)");
  curl_easy_setopt(client,CURLOPT_PROTOCOLS,(long)(CURLPROTO_HTTP|CURLPROTO_HTTPS));
  curl_easy_setopt(client,CURLOPT_FOLLOWLOCATION,0L);
  curl_easy_setopt(client,CURLOPT_PROXY,"");
  curl_easy_setopt(client,CURLOPT_NOSIGNAL,1L);
  curl_easy_setopt(client,CURLOPT_CONNECTTIMEOUT,8L);
  curl_easy_setopt(client,CURLOPT_TIMEOUT,(long)(timeout>=5&&timeout<=60?timeout:15));
  curl_easy_setopt(client,CURLOPT_SSL_VERIFYPEER,1L);
  curl_easy_setopt(client,CURLOPT_SSL_VERIFYHOST,2L);
  curl_easy_setopt(client,CURLOPT_CAINFO,"/cacert.pem");
  curl_easy_setopt(client,CURLOPT_ACCEPT_ENCODING,"");
  curl_easy_setopt(client,CURLOPT_WRITEFUNCTION,append_body);
  failure=(int)curl_easy_perform(client);
  curl_easy_getinfo(client,CURLINFO_RESPONSE_CODE,&status);
  curl_slist_free_all(headers);curl_easy_cleanup(client);
  memset(auth,0,sizeof(auth));
  if(failure){clear_body();return "";}
  return body?body:"";
}
EMSCRIPTEN_KEEPALIVE int portal_status(void){return (int)status;}
EMSCRIPTEN_KEEPALIVE int portal_error(void){return failure;}
EMSCRIPTEN_KEEPALIVE void portal_clear(void){clear_body();}
int main(void){curl_global_init(CURL_GLOBAL_DEFAULT);return 0;}
